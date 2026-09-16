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
#pragma once

#include <jsc/jsc.h>
#include <string>
#include <wpe/webkit-web-extension.h>
#include <glib.h>

namespace FireboltExtension {
namespace Helper {


inline const char* INVALID_STATE_ERROR = "Invalid PageState pointer";
inline const char* BUILDER_BUILD_FAILED_ERROR = "Failed to build using transport";

struct FireboltExtensionConfig {
  char* fireboltEndpoint;
  char* extensionPath;
  bool enableDebug;
};
JSCValue* evaluate_bridge_script(JSCContext* jsContext);
JSCValue* evaluate_builder_script(JSCContext* jsContext);
JSCValue* get_extension_script(const char* extensionPath, JSCContext* jsContext);
void print_exception(JSCContext* context, JSCException* exception, gpointer data);
JSCValue* create_transport(JSCContext* jsContext, const char* url, const bool enableDebug);
void clear_transport();
} // namespace Helper
} // namespace FireboltExtension
