/*
 * If not stated otherwise in this file or this component's LICENSE file the
 * following copyright and licenses apply:
 *
 * Copyright 2026 RDK Management.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
 #include <wpe/webkit-web-extension.h>
 #include <cstring>
 #include <cstdarg>
 #include <optional>
 #include <string>
 #include <glib.h>
 #include "websocketclient.h"
 #include <memory>
 #include <mutex>


struct JSListener {
    JSCContext* ctx;
    JSCValue*   cb;
};

struct PageState {
    gchar* fireboltEndpoint;
    gchar* fireboltBridgeScript;
    gchar* fireboltBuilderScript;
    gchar* extensionScript;
    bool connected = false;
    std::unique_ptr<WebSocketClient> wsClient;
    JSListener messageListener;
    JSListener connectionListener;
};

constexpr int PAGE_STATE_UNAVAILABLE = 1001;
const char* INVALID_STATE_ERROR = "Invalid PageState pointer";

static PageState* get_page_state(WebKitWebPage* page, bool suppress_warning = false)
{

    if (!page) {
        g_warning("get_page_state: user_data is not a WebKitWebPage");
        return nullptr;
    }

    if (g_object_get_data(G_OBJECT(page), "firebolt-page-state") == nullptr)
    {
        if (!suppress_warning) {
            g_warning("get_page_state: page does not have firebolt-page-state data");
        }
        return nullptr;
    } else {
        return static_cast<PageState*>(g_object_get_data(G_OBJECT(page), "firebolt-page-state"));
    }
}

static PageState* validate_page_state(gpointer user_data, bool suppress_warning = false)
{
    if (!user_data) {
        g_warning("validate_page_state: user_data is null");
        return nullptr;
    }

    auto page = reinterpret_cast<WebKitWebPage*>(user_data);

    return get_page_state(page, suppress_warning);
}

static void reset_page_state(PageState* state)
{
    state->connected = false;
	if (state->wsClient) {
	 state->wsClient->Cleanup();
	}
	if (state->messageListener.ctx) {
     g_object_unref(state->messageListener.ctx);
	 state->messageListener.ctx = nullptr;
	}

	if (state->messageListener.cb) {
     g_object_unref(state->messageListener.cb);
	 state->messageListener.cb = nullptr;
	}

	if (state->connectionListener.ctx) {
     g_object_unref(state->connectionListener.ctx);
	 state->connectionListener.ctx = nullptr;
	}

	if (state->connectionListener.cb) {
     g_object_unref(state->connectionListener.cb);
	 state->connectionListener.cb = nullptr;
	}

	g_message("reset_page_state: reset page state\n");
}

static void clear_page_state(PageState* state)
{
    if (!state) {
        g_warning("clear_page_state: state is null");
        return;
    }
    g_clear_pointer(&state->fireboltEndpoint, g_free);
    g_clear_pointer(&state->fireboltBridgeScript, g_free);
    g_clear_pointer(&state->fireboltBuilderScript, g_free);
    g_clear_pointer(&state->extensionScript, g_free);
    reset_page_state(state);
    g_message("clear_page_state: cleared page state\n");
}


constexpr int INVALID_PARAMETERS = 1002;
constexpr int PAGE_STATE_CLIENT_ID_MISSING = 1003;
constexpr int CLIENT_ID_MISMATCH = 1004;
constexpr int UNEXPECTED_ERROR = 1005;

static JSCValue* create_result(JSCContext* ctx,
                              bool success,
                              int errorCode)
{
    JSCValue* result = jsc_value_new_object(ctx, nullptr, nullptr);

    // success: boolean
    jsc_value_object_set_property(
        result,
        "success",
        jsc_value_new_boolean(ctx, success)
    );

    // errorCode only when failure
    if (!success) {
        jsc_value_object_set_property(
            result,
            "errorCode",
            jsc_value_new_number(ctx, errorCode)
        );
    }

    return result;
}

// Forward declarations for callback functions
static JSCValue* connect_cb(gpointer user_data);
static JSCValue* disconnect_cb(gpointer user_data);
static JSCValue* send_cb(const char* jsMessage, gpointer user_data);
static JSCValue* on_connection_status_cb(JSCValue* js_function, gpointer user_data);
static JSCValue* on_message_cb(JSCValue* js_function, gpointer user_data);


static JSCValue* builder_cb(gpointer user_data)
{
    // Native implementation
    // params[] are JS arguments
    JSCContext* ctx = jsc_context_get_current();

    auto state = validate_page_state(user_data);
    if (!state) {
        g_warning("builder_cb: invalid page state");
        return create_result(ctx, false, PAGE_STATE_UNAVAILABLE);
    }

    JSCValue *builder = jsc_context_evaluate(ctx, state->fireboltBuilderScript, -1);
    if (!builder) {
        g_warning("failed to evaluate the injected JS code");
        return create_result(ctx, false, PAGE_STATE_UNAVAILABLE);
    }

    // Create transport object
    JSCValue *transport = jsc_value_new_object(ctx, NULL, NULL);


    // Create connect() function - pass page pointer as user_data
    JSCValue *connect_fn = jsc_value_new_function(
        ctx,
        "connect",
        G_CALLBACK(connect_cb),
        user_data,
        nullptr,  // No destructor needed since we're not allocating
        JSC_TYPE_VALUE,
        0  // No parameters
    );
    jsc_value_object_set_property(transport, "connect", connect_fn);
    g_clear_object(&connect_fn);

    // onConnectionStatus() - pass page pointer as user_data
    JSCValue *on_conn_status_fn = jsc_value_new_function(
      ctx, "onConnectionStatus", G_CALLBACK(on_connection_status_cb),
      user_data,
      nullptr,
      JSC_TYPE_VALUE, 1, JSC_TYPE_VALUE);
    jsc_value_object_set_property(transport, "onConnectionStatus", on_conn_status_fn);
    g_clear_object(&on_conn_status_fn);
    

    JSCValue *send_fn = jsc_value_new_function(
        ctx,
        "send",
        G_CALLBACK(send_cb),
        user_data,
        nullptr,
        JSC_TYPE_VALUE,
        1, 
        G_TYPE_STRING
    );
    jsc_value_object_set_property(transport, "send", send_fn);
    g_clear_object(&send_fn);

    // onMessage() - pass page pointer as user_data
    JSCValue *on_message_fn = jsc_value_new_function(
      ctx, "onMessage", G_CALLBACK(on_message_cb),
      user_data,
      nullptr,
      JSC_TYPE_VALUE, 1, JSC_TYPE_VALUE);
    jsc_value_object_set_property(transport, "onMessage", on_message_fn);
    g_clear_object(&on_message_fn);

    // disconnect() function - pass page pointer as user_data
    JSCValue *disconnect_fn = jsc_value_new_function(
        ctx,
        "disconnect",
        G_CALLBACK(disconnect_cb),
        user_data,
        nullptr,
        JSC_TYPE_VALUE,
        0 // No parameters
    );
    jsc_value_object_set_property(transport, "disconnect", disconnect_fn);
    g_clear_object(&disconnect_fn);

    // final builder opts
    JSCValue *builderOpts = jsc_value_new_object(ctx, NULL, NULL);
    jsc_value_object_set_property(builderOpts, "transport", transport);

    // Extn string
    JSCValue *extnScript = jsc_value_new_string(ctx, state->extensionScript);
    jsc_value_object_set_property(builderOpts, "extensionSchema", extnScript);
    
    bool finalResult = false;
    JSCValue *builderResult = jsc_value_function_call(builder, JSC_TYPE_VALUE, builderOpts, G_TYPE_NONE);
    if (!builderResult) {
        g_warning("failed to build using transport");
    } else {
        g_message("Firebolt transport injected successfully to builder\n");
        finalResult = true;
    }
    g_clear_object(&extnScript);
    g_clear_object(&builderOpts);
    g_clear_object(&transport);
    g_clear_object(&builder);
    g_message("builder_cb: injected transport into builder returning builder \n");
    return builderResult;
}

static JSCValue* connect_cb(gpointer user_data)
{
    // Native implementation
    // params[] are JS arguments
    g_message("connect called\n");
    JSCContext* ctx = jsc_context_get_current();

    auto state = validate_page_state(user_data);
    if (!state) {
        g_warning("connect_cb: invalid page state");
        return create_result(ctx, false, PAGE_STATE_UNAVAILABLE);
    }

    // connect using websocket to the firebolt endpoint and set state->connected = true if successful
    // check page state for already connected
    if (state->connected) {
        g_message("Already connected, ignoring connect call\n");
        return create_result(ctx, true, 0);
    } else {
        g_message("Connecting to Firebolt endpoint: %s\n", state->fireboltEndpoint);
        state->wsClient = std::make_unique<WebSocketClient>(state->fireboltEndpoint);
        g_message("WebSocket client created, attempting to connect...\n");

        // Use page pointer to validate state is still valid in async callbacks
        auto page = reinterpret_cast<WebKitWebPage*>(user_data);

        state->wsClient->Connect(
            // onConnect callback
            [page](const bool success) {
                auto state = get_page_state(page);
                if (state) {
                    state->connected = success;
                    g_message("WebSocket connection %s\n", success ? "successful" : "failed");
                    if (state->connectionListener.cb && state->connectionListener.ctx) {
                        JSCValue* arg = jsc_value_new_string(state->connectionListener.ctx, success ? "connected" : "disconnected");
                        JSCValue* ret = jsc_value_function_call(
                                        state->connectionListener.cb,
                                        JSC_TYPE_VALUE, arg,
                                        G_TYPE_NONE
                                    );
                        g_clear_object(&ret);
                    }
                }
            },
            // onMessage callback
            [page](const char* message, size_t size) {
                auto state = get_page_state(page);
                if (state) {
                    g_message("Received message: %.*s\n", (int)size, message);
                    if (state->messageListener.cb && state->messageListener.ctx) {
                        JSCValue* arg = jsc_value_new_string(state->messageListener.ctx, message);
                        JSCValue* ret = jsc_value_function_call(
                                        state->messageListener.cb,
                                        JSC_TYPE_VALUE, arg,
                                        G_TYPE_NONE
                                    );
                        g_clear_object(&ret);
                    }
                }
            }
        );
        g_message("WebSocket Connect method returned, connection state: %s\n", state->connected ? "connected" : "not connected");
        if (state->connected) {
            return create_result(ctx, true, 0);
        }
    }

    return create_result(ctx, false, UNEXPECTED_ERROR);
}

static JSCValue* disconnect_cb(gpointer user_data)
{
    g_message("disconnect called\n");
    JSCContext* ctx = jsc_context_get_current();
    auto state = validate_page_state(user_data);
    if (!state) {
        g_warning("disconnect_cb: invalid page state");
        return create_result(ctx, false, PAGE_STATE_UNAVAILABLE);
    }
    g_message("Page state obtained for disconnect\n");
    if (state->connected && state->wsClient) {
        state->wsClient->Disconnect();
        state->connected = false;
    } else {
        if (!state->connected) {
            g_warning("disconnect called but not connected to Firebolt endpoint");
        } else {
            g_warning("disconnect called but WebSocket client is not available");
        }
    }
    return create_result(ctx, true, 0);
}

static JSCValue* send_cb(const char* jsMessage,
        gpointer user_data)
{
    // Native implementation
    // params[] are JS arguments
    JSCContext* ctx = jsc_context_get_current();

    if (!jsMessage) {
        g_warning("send requires a message string parameter");
        return create_result(ctx, false, INVALID_PARAMETERS);
    }

    auto state = validate_page_state(user_data);
    if (!state) {
        g_warning("send: invalid page state");
        return create_result(ctx, false, PAGE_STATE_UNAVAILABLE);
    }

    if (state->connected && state->wsClient) {
        if (jsMessage) {
            state->wsClient->SendMessage(jsMessage);
        }
        g_message("send called with message: %s\n", jsMessage);
    } else {
        if (!state->connected) {
            g_warning("send called but not connected to Firebolt endpoint");
        } else {
            g_warning("send called but WebSocket client is not available");
        }
    }

    return create_result(ctx, true, 0);
}

static JSCValue* on_connection_status_cb(JSCValue* js_function,
              gpointer user_data)
{
    g_message("onConnectionStatus callback called\n");

    JSCContext* ctx = jsc_context_get_current();
    if (!js_function || !jsc_value_is_function(js_function)) {
        g_warning("onConnectionStatus requires a function parameter");
        return create_result(ctx, false, INVALID_PARAMETERS);
    }
    g_message("onConnectionStatus parameter is a valid function\n");

    auto state = validate_page_state(user_data);
    if (!state) {
        g_warning("onConnectionStatus: invalid page state");
        return create_result(ctx, false, PAGE_STATE_UNAVAILABLE);
    }

    if (state->connectionListener.ctx && state->connectionListener.cb) {
        g_warning("onConnectionStatus: connection listener already set");
        return create_result(ctx, false, INVALID_PARAMETERS);
    }
    
    // Todo setup jsfunction and jsContext
    state->connectionListener.ctx = reinterpret_cast<JSCContext*>(g_object_ref(ctx));
    state->connectionListener.cb = reinterpret_cast<JSCValue*>(g_object_ref(js_function));

    return create_result(ctx, true, 0);
}

static JSCValue* on_message_cb(JSCValue* js_function,
              gpointer user_data)
{
    JSCContext* ctx = jsc_context_get_current();

    if (!js_function || !jsc_value_is_function(js_function)) {
        g_warning("onMessage requires a function parameter");
        return create_result(ctx, false, INVALID_PARAMETERS);
    }

    auto state = validate_page_state(user_data);
    if (!state) {
        g_warning("onMessage: invalid page state");
        return create_result(ctx, false, PAGE_STATE_UNAVAILABLE);
    }

    if (state->messageListener.ctx && state->messageListener.cb) {
        g_warning("onMessage: message listener already set");
        return create_result(ctx, false, INVALID_PARAMETERS);
    }
    
    state->messageListener.ctx = reinterpret_cast<JSCContext*>(g_object_ref(ctx));
    state->messageListener.cb =  reinterpret_cast<JSCValue*>(g_object_ref(js_function));
    

    return create_result(ctx, true, 0);
}

static bool setup_bridge_script(JSCContext *ctx, WebKitWebPage* page, PageState* state)
{
    JSCValue *setBuilderFactory = jsc_context_evaluate(ctx, state->fireboltBridgeScript, -1);
    if (!setBuilderFactory) {
        g_warning("failed to evaluate the injected JS code");
        return false;
    }

    g_message("Bridge script evaluated successfully\n");

    JSCValue *global = jsc_context_get_global_object(ctx);
    JSCValue *serviceManager = jsc_value_object_get_property(global, "FireboltServiceManager");
    g_clear_object(&global);

    if (!serviceManager || !jsc_value_is_object(serviceManager)) {
        g_warning("failed to get the FireboltServiceManager object");
        return false;
    }

    // Create platform object
    JSCValue *builder = jsc_value_new_object(ctx, NULL, NULL);

    // Pass page pointer as user_data
    auto page_ptr = reinterpret_cast<gpointer>(page);

    // Create builder() function - pass page pointer as user_data
    JSCValue *builder_fn = jsc_value_new_function(
        ctx,
        "get",
        G_CALLBACK(builder_cb),
        page_ptr,
        nullptr,  // No destructor needed since we're not allocating
        JSC_TYPE_VALUE,
        0  // No parameters
    );
    jsc_value_object_set_property(builder, "get", builder_fn);
    g_clear_object(&builder_fn);

    bool finalResult = false;
    JSCValue *serviceManagerBuilderResult = jsc_value_function_call(setBuilderFactory, JSC_TYPE_VALUE, builder, G_TYPE_NONE);
    if (!serviceManagerBuilderResult) {
        g_warning("failed to call FireboltServiceManager.builder");
    } else {
        g_message("Firebolt builder factory injected successfully\n");
        g_clear_object(&serviceManagerBuilderResult);
        finalResult = true;
    }
    
    g_clear_object(&setBuilderFactory);
    g_clear_object(&builder);
   
    return finalResult;
}




// -----------------------------------------------------------------------------
/*!
    \internal

    (An) Entry point of the extension.

 */
static void onWindowObjectCleared(WebKitScriptWorld *world,
                                  WebKitWebPage *page,
                                  WebKitFrame *frame,
                                  gpointer userData)
{
    g_message("onWindowObjectCleared called for frame\n");
    // We only want to inject our JS code into the main frame, not into iframes
    if (webkit_frame_is_main_frame(frame) == FALSE)
        return;

    GVariant* settings = (GVariant*) userData;
    if (!settings) {
        // Below code is only for safety - it should never happen based on initialization
        g_warning("no settings found for firebolt extension");
        return;
    }

    auto state = get_page_state(page, true);

    if (state) {
        reset_page_state(state);
    } else {
        // ------------------------- First Time Page State ---------------------
        auto pageState = new PageState();

        pageState->connected = false;
        g_variant_lookup(settings, "fireboltEndpoint", "s", &pageState->fireboltEndpoint);
        g_variant_lookup(settings, "fireboltBridgeScript", "s", &pageState->fireboltBridgeScript);
        g_variant_lookup(settings, "fireboltBuilderScript", "s", &pageState->fireboltBuilderScript);
        g_variant_lookup(settings, "extensionScript", "s", &pageState->extensionScript);
        g_message("Successfully loaded settings to state\n");

        // Below code is only for safety - it should never happen based on initialization
        if (!pageState->fireboltEndpoint || pageState->fireboltEndpoint[0] == '\0') {
            g_warning("fireboltEndpoint missing/empty in settings");
            clear_page_state(pageState);
            return;
        }

        // Below code is only for safety - it should never happen based on initialization
        if (!pageState->fireboltBridgeScript || (strlen(pageState->fireboltBridgeScript) == 0))
        {
            g_warning("firebolt extension enabled, but no injected script URL set, "
                    "disabling firebolt bridge support");
            clear_page_state(pageState);
            return;
        }

	    g_object_set_data_full(
			            G_OBJECT(page),   
				        "firebolt-page-state",
			            pageState,
			            [](gpointer data) {
			                // Custom destroy function to clean up the PageState when the page is destroyed
			                auto* state_ptr = static_cast<PageState*>(data);
			                clear_page_state(state_ptr);
			                delete state_ptr;
			            }
											                                                                                     );
        state = get_page_state(page);
        // ------------------------- End First Time Page State ---------------------
        
    }

    JSCContext *jsContext = webkit_frame_get_js_context_for_script_world(frame, world);
    if (!jsContext)
    {
        g_warning("failed to get the JS context");
        return;
    }

    if (!setup_bridge_script(jsContext, page, state)) {
        g_warning("failed to evaluate the bridge script");
        clear_page_state(state);
        g_clear_object(&jsContext);
        return;
    }
    
    g_clear_object(&jsContext);
}

/*!
    Returns the firebolt-bridge.js as a string content to be injected by the
    WPE Browser extension. 
 */

std::string fireboltBridgeScript()
{
    GError *error = nullptr;
    GBytes *bytes = g_resources_lookup_data("/org/rdk/browser/extensions/firebolt-bridge.js", G_RESOURCE_LOOKUP_FLAGS_NONE, &error);
    if (bytes)
    {
        gsize sz;
        const void *ptr = g_bytes_get_data(bytes, &sz);
        if (ptr && sz)        {
            std::string result(reinterpret_cast<const char*>(ptr), sz);
            g_bytes_unref(bytes);
            return result;
        } else {
            g_bytes_unref(bytes);
            g_warning("failed to read bridge script data from resources");
        }
    }
    else if (error)
    {
        g_warning("failed to load firebolt bridge script from resources, %s", error->message);
        g_error_free(error); error = nullptr;
    }
    return "";
}

/*!
    Returns the firebolt-builder.js as a string content to be injected by the
    WPE Browser extension. 
 */

std::string fireboltBuilderScript()
{
    GError *error = nullptr;
    GBytes *bytes = g_resources_lookup_data("/org/rdk/browser/extensions/firebolt-builder.js", G_RESOURCE_LOOKUP_FLAGS_NONE, &error);
    if (bytes)
    {
        gsize sz;
        const void *ptr = g_bytes_get_data(bytes, &sz);
        if (ptr && sz)        {
            std::string result(reinterpret_cast<const char*>(ptr), sz);
            g_bytes_unref(bytes);
            return result;
        } else {
            g_bytes_unref(bytes);
            g_warning("failed to read builder script data from resources");
        }
    }
    else if (error)
    {
        g_warning("failed to load firebolt builder script from resources, %s", error->message);
        g_error_free(error); error = nullptr;
    }
    return "";
}


 extern "C"
{
    // -------------------------------------------------------------------------
    /*!
        Entry point for the WPEWebKit extension.

        \see  https://webkitgtk.org/reference/webkit2gtk/stable/WebKitWebExtension.html

     */
    G_MODULE_EXPORT void webkit_web_extension_initialize_with_user_data(WebKitWebExtension *extension,
                                                                        GVariant *userData)
    {
        g_message("Initializing WPE Firebolt Extension\n");
        // Read environment variable for FIREBOLT_ENDPOINT
        const char* firebolt_endpoint_env = getenv("FIREBOLT_ENDPOINT");
        // if firebolt _endpoint is valid set it, otherwise use the default
        gchar *fireboltEndpoint = nullptr;
        if (firebolt_endpoint_env && strlen(firebolt_endpoint_env) > 0) {
            fireboltEndpoint = g_strdup(firebolt_endpoint_env);
        }

        // extension path
        gchar *extensionPath = nullptr;
        
        // check if the firebolt extension should be enabled and if so get the firebolt endpoint url
        GVariant *injectedSettings = g_variant_lookup_value(userData, "firebolt", G_VARIANT_TYPE_VARDICT);

        if (injectedSettings) {
            g_message("Firebolt extension settings found\n");
            // override the firebolt endpoint if it is set in the injected settings
            g_variant_lookup(injectedSettings, "fireboltEndpoint", "s", &fireboltEndpoint);
            // check for extensions
            g_variant_lookup(injectedSettings, "fireboltExtensionPath", "s", &extensionPath);
        }
            
        if (!fireboltEndpoint || fireboltEndpoint[0] == '\0') {
            g_warning("FIREBOLT_ENDPOINT not set, exiting\n");
            return;
        }
        
        gchar *fireboltBridgeScriptStr = nullptr;
        
        // load user script from resource bundle
        fireboltBridgeScriptStr = g_strdup(fireboltBridgeScript().c_str());

        if (!fireboltBridgeScriptStr) {
            g_warning("Failed to load firebolt bridge script\n");
            return;
        }

        gchar *fireboltBuilderScriptStr = nullptr;

        // load builder script from resource bundle
        fireboltBuilderScriptStr = g_strdup(fireboltBuilderScript().c_str());
        
        if (!fireboltBuilderScriptStr) {
            g_warning("Failed to load firebolt builder script\n");
            return;
        }     
        
        // load extension script if extension path is provided
        gchar *extensionScriptStr = nullptr;
        if (extensionPath) {
            auto success = g_file_get_contents(extensionPath, &extensionScriptStr, nullptr, nullptr);
            g_free(extensionPath);
            if (!success) {
                g_warning("Failed to load firebolt extension script continue without extension\n");
            }
        }
        
        // ---------- Setup Window Object Cleared Params ------------------------
        GVariantBuilder builder;
        g_variant_builder_init(&builder, G_VARIANT_TYPE_VARDICT);
        g_variant_builder_add(&builder, "{sv}", "fireboltBridgeScript", g_variant_new_string(fireboltBridgeScriptStr));
        g_variant_builder_add(&builder, "{sv}", "fireboltBuilderScript", g_variant_new_string(fireboltBuilderScriptStr));
        g_variant_builder_add(&builder, "{sv}", "fireboltEndpoint", g_variant_new_string(fireboltEndpoint));
        if (extensionScriptStr) {
            g_message("WPE Firebolt Extension loaded with extension script\n");
            g_message("Extension script size: %zu bytes\n", strlen(extensionScriptStr));
            g_variant_builder_add(&builder, "{sv}", "extensionScript", g_variant_new_string(extensionScriptStr));
            g_free(extensionScriptStr);
        } else {
            // add blank extension script
            g_variant_builder_add(&builder, "{sv}", "extensionScript", g_variant_new_string(""));
        }

        GVariant *settings = g_variant_builder_end(&builder);
        g_message("WPE Firebolt Extension enabled with Firebolt Endpoint: %s\n", fireboltEndpoint);
        // Here you would initialize your extension's functionality, e.g., set up IPC, hooks, etc.
        // hook the following signal, so we can inject JS code into the page
        g_signal_connect_data(webkit_script_world_get_default(),
                        "window-object-cleared",
                        G_CALLBACK(onWindowObjectCleared),
                        settings,
                        (GClosureNotify)g_variant_unref,
                        (GConnectFlags)0);

        g_clear_pointer(&fireboltEndpoint, g_free);
        g_clear_pointer(&fireboltBridgeScriptStr, g_free);
        g_clear_pointer(&fireboltBuilderScriptStr, g_free);
        // ------------- End Window Object Cleared Setup --------------------------
        
    }
}
