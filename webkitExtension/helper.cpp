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
 #include "helper.h"
 #include "wstransport.h"

 namespace FireboltExtension {
 namespace Helper {

void print_exception(JSCContext* context, JSCException* exception, gpointer data)
{
    g_warning("%s", jsc_exception_get_message(exception));
}

JSCValue* evaluate_bridge_script(JSCContext* jsContext)
{
    GError *error = nullptr;
    GBytes *bytes = g_resources_lookup_data("/org/rdk/browser/extensions/firebolt-bridge.js", G_RESOURCE_LOOKUP_FLAGS_NONE, &error);
    if (bytes)
    {
        gsize sz;
        const void *ptr = g_bytes_get_data(bytes, &sz);
        if (ptr && sz)        {
            jsc_context_push_exception_handler(jsContext, print_exception, NULL, NULL);
            JSCValue* script = jsc_context_evaluate(jsContext, (const char*)(ptr), sz);
            if (!jsc_value_is_function(script))
            {
                 g_critical("Cannot inject builder script");
            } else {
                return script;
            }
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
    return nullptr;
}

JSCValue* evaluate_builder_script(JSCContext* jsContext)
{
    GError *error = nullptr;
    GBytes *bytes = g_resources_lookup_data("/org/rdk/browser/extensions/firebolt-builder.js", G_RESOURCE_LOOKUP_FLAGS_NONE, &error);
    if (bytes)
    {
        gsize sz;
        const void *ptr = g_bytes_get_data(bytes, &sz);
        if (ptr && sz)        {
            jsc_context_push_exception_handler(jsContext, print_exception, NULL, NULL);
            JSCValue* script = jsc_context_evaluate(jsContext, (const char*)(ptr), sz);
            if (!jsc_value_is_function(script))
            {
                 g_critical("Cannot inject builder script");
            } else {
                return script;
            }
           
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
    return nullptr;
}

JSCValue* get_extension_script(const char* extensionPath, JSCContext* jsContext) {
    char *extensionScriptStr = nullptr;
    if (extensionPath) {
        gsize length;
        if (!g_file_get_contents(extensionPath, &extensionScriptStr, &length, nullptr)) {
            g_warning("Failed to load firebolt extension script continue without extension");
            extensionScriptStr = g_strdup("");
        }
    } else {
        extensionScriptStr = g_strdup("");
    }
    JSCValue* result = jsc_value_new_string(jsContext, extensionScriptStr);
    g_free(extensionScriptStr);
    return result;
}

JSCValue* create_transport(JSCContext* jsContext, const char* url, const bool enableDebug)
{
    // Keep single connection active, the last one wins
    clear_transport();

    JSCClass* transportClass = create_transport_class(jsContext);
    return jsc_value_new_object(
        jsContext,
        TransportClass::create_instance(url),
        transportClass);
}

void clear_transport()
{
    if (WebSocketTransport::s_transport)
    {
        WebSocketTransport::s_transport->clear();
    }    
}

 } // namespace Helper
} // namespace FireboltExtension