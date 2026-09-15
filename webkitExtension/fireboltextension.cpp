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
 #include <memory>
 #include "helper.h"

 using namespace FireboltExtension::Helper;

static JSCValue* builder_cb(gpointer user_data)
{
    // Native implementation
    // params[] are JS arguments
    JSCContext* ctx = jsc_context_get_current();

    auto config = static_cast<FireboltExtensionConfig*>(user_data);
    if (!config) {
        g_warning("builder_cb: invalid page config");
        jsc_context_throw(jsc_context_get_current(), INVALID_STATE_ERROR);
    }

    JSCValue *builder = evaluate_builder_script(ctx);
    if (!builder) {
        g_warning("failed to evaluate the injected JS code");
        jsc_context_throw(jsc_context_get_current(), INVALID_STATE_ERROR);
    }

    g_message("Builder script evaluated successfully");

    // Create transport object
    JSCValue *transport = create_transport(ctx, config->fireboltEndpoint);

    if (!transport) {
        g_warning("failed to create transport object");
        jsc_context_throw(jsc_context_get_current(), INVALID_STATE_ERROR);
    }
    
    // final builder opts
    JSCValue *builderOpts = jsc_value_new_object(ctx, NULL, NULL);
    jsc_value_object_set_property(builderOpts, "transport", transport);

    // Extn string
    if (!config->extensionPath || config->extensionPath[0] == '\0') {
        g_warning("extensionPath is empty, skipping extensionSchema");
    } else {
        JSCValue *extnScript = get_extension_script(config->extensionPath, ctx);
        jsc_value_object_set_property(builderOpts, "extensionSchema", extnScript);
        g_clear_object(&extnScript);
    }
    
    // Debug flag
    jsc_value_object_set_property(builderOpts, "enableDebug", jsc_value_new_boolean(ctx, config->enableDebug));
    JSCValue *builderResult = jsc_value_function_call(builder, JSC_TYPE_VALUE, builderOpts, G_TYPE_NONE);
    if (!builderResult) {
        g_warning("failed to build using transport");
        jsc_context_throw(ctx, BUILDER_BUILD_FAILED_ERROR);
    } else {
        g_message("Firebolt transport injected successfully to builder");
    }
    g_message("builder_cb: injected transport into builder returning builder");
    g_clear_object(&transport);
    g_clear_object(&builderOpts);
    g_clear_object(&builder);
    return builderResult;
}

static bool setup_bridge_script(JSCContext *ctx, WebKitWebPage *page, gpointer userData)
{
    JSCValue *builderObj = evaluate_bridge_script(ctx);
    if (!builderObj) {
        g_warning("failed to evaluate the injected JS code");
        return false;
    }
    // Create platform object
    JSCValue *builder = jsc_value_new_object(ctx, NULL, NULL);

    // Create builder() function - pass config pointer as user_data
    JSCValue *builder_fn = jsc_value_new_function(
        ctx,
        "get",
        G_CALLBACK(builder_cb),
        userData,
        nullptr,  // No destructor needed since we're not allocating
        JSC_TYPE_VALUE,
        0  // No parameters
    );
    jsc_value_object_set_property(builder, "get", builder_fn);
    g_clear_object(&builder_fn);

    bool finalResult = false;
    JSCValue *serviceManagerBuilderResult = jsc_value_function_call(builderObj, JSC_TYPE_VALUE, builder, G_TYPE_NONE);
    if (!serviceManagerBuilderResult) {
        g_warning("failed to call FireboltServiceManager.builder");
    } else {
        g_message("Firebolt builder factory injected successfully");
        g_clear_object(&serviceManagerBuilderResult);
        finalResult = true;
    }
    
    g_clear_object(&builderObj);
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
    // We only want to inject our JS code into the main frame, not into iframes
    if (webkit_frame_is_main_frame(frame) == FALSE)
        return;
    
    JSCContext *jsContext = webkit_frame_get_js_context_for_script_world(frame, world);
    if (!jsContext)
    {
        g_warning("failed to get the JS context");
        return;
    }

    if (!setup_bridge_script(jsContext, page, userData)) {
        g_warning("failed to evaluate the bridge script");
        g_clear_object(&jsContext);
        return;
    }
    
    g_clear_object(&jsContext);
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
        g_message("Initializing WPE Firebolt Extension");
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

        // debug
        bool enableDebug = false;

        if (injectedSettings) {
            g_message("Firebolt extension settings found");
            // override the firebolt endpoint if it is set in the injected settings
            g_variant_lookup(injectedSettings, "fireboltEndpoint", "&s", &fireboltEndpoint);
            // check for extensions
            g_variant_lookup(injectedSettings, "fireboltExtensionPath", "&s", &extensionPath);
            // check for debug
            g_variant_lookup(injectedSettings, "enableDebug", "b", &enableDebug);
        }
        g_variant_unref(injectedSettings);
            
        
        if (!fireboltEndpoint || fireboltEndpoint[0] == '\0') {
            g_warning("FIREBOLT_ENDPOINT not set, exiting");
            g_clear_pointer(&fireboltEndpoint, g_free);
            g_clear_pointer(&extensionPath, g_free);
            return;
        }
        
        struct FireboltExtensionConfig *config = g_new0(struct FireboltExtensionConfig, 1);
        config->fireboltEndpoint = g_strdup(fireboltEndpoint);
        config->enableDebug = enableDebug;

        // Log the extension path if it's set
        if (extensionPath && extensionPath[0] != '\0') {
            g_message("Firebolt extension path: %s", extensionPath);
            config->extensionPath = g_strdup(extensionPath);
        }
        
        g_message("WPE Firebolt Extension endpoint: %s", fireboltEndpoint);
        g_signal_connect(webkit_script_world_get_default(),
                        "window-object-cleared",
                        G_CALLBACK(onWindowObjectCleared),
                        config);
        // ------------- End Window Object Cleared Setup --------------------------
        
    }
}
