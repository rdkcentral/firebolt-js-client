
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

#include "wstransport.h"

WebSocketTransport *WebSocketTransport::s_transport = nullptr;

ExceptionHandler::ExceptionHandler(JSCContext *context) : _context(context) {
  jsc_context_push_exception_handler(
      _context,
      [](JSCContext *context, JSCException *exception, gpointer) {
        g_warning("Unexpected exception: %s",
                  jsc_exception_get_message(exception));
        jsc_context_clear_exception(context);
      },
      nullptr, nullptr);
}

ExceptionHandler::~ExceptionHandler() { pop(); }

void ExceptionHandler::pop() { jsc_context_pop_exception_handler(_context); }

bool BaseTransport::check_callback(JSCValue *cb) {
  if (!jsc_value_is_function(cb) && !jsc_value_is_null(cb) &&
      !jsc_value_is_undefined(cb)) {
    jsc_context_throw(jsc_context_get_current(),
                      "Unexpected type of callback value.");
    return false;
  }
  return true;
}

BaseTransport::BaseTransport() { g_debug("BaseTransport: ctor"); }

BaseTransport::~BaseTransport() {
  g_debug("BaseTransport: Dtor");
  clear();
}

void BaseTransport::clear() {
  g_debug("BaseTransport: clear!");

  g_clear_object(&_on_open_cb);
  g_clear_object(&_on_close_cb);
  g_clear_object(&_on_error_cb);
  g_clear_object(&_on_message_cb);
  _state = Closed;
}

int BaseTransport::state() const { return static_cast<int>(_state); }

JSCValue *BaseTransport::get_on_open_callback() const {
  if (_on_open_cb)
    return g_object_ref(_on_open_cb);
  return jsc_value_new_null(jsc_context_get_current());
}

JSCValue *BaseTransport::get_on_close_callback() const {
  if (_on_close_cb)
    return g_object_ref(_on_close_cb);
  return jsc_value_new_null(jsc_context_get_current());
}

JSCValue *BaseTransport::get_on_error_callback() const {
  if (_on_error_cb)
    return g_object_ref(_on_error_cb);
  return jsc_value_new_null(jsc_context_get_current());
}

JSCValue *BaseTransport::get_on_message_callback() const {
  if (_on_message_cb)
    return g_object_ref(_on_message_cb);
  return jsc_value_new_null(jsc_context_get_current());
}

void BaseTransport::set_on_open_callback(JSCValue *callback) {
  if (!check_callback(callback))
    return;
  g_clear_object(&_on_open_cb);
  _on_open_cb = g_object_ref(callback);
}

void BaseTransport::set_on_close_callback(JSCValue *callback) {
  if (!check_callback(callback))
    return;
  g_clear_object(&_on_close_cb);
  _on_close_cb = g_object_ref(callback);
}

void BaseTransport::set_on_error_callback(JSCValue *callback) {
  if (!check_callback(callback))
    return;
  g_clear_object(&_on_error_cb);
  _on_error_cb = g_object_ref(callback);
}

void BaseTransport::set_on_message_callback(JSCValue *callback) {
  if (!check_callback(callback))
    return;
  g_clear_object(&_on_message_cb);
  _on_message_cb = g_object_ref(callback);
}

WebSocketTransport::WebSocketTransport(const char *url, const bool enableDebug)
    : _enableDebug(enableDebug) {
  g_debug("WebSocketTransport created %p", this);
  s_transport = this;
  WebSocketCallback callbacks;
  callbacks.onMessage = [this](GBytes *message) { on_message(message); };
  callbacks.onOpen = [this]() { on_open(); };
  callbacks.onError = [this](const char *error) { on_error(error); };
  callbacks.onClosed = [this]() { on_close(); };
  _ws = std::make_unique<WebSocketClient>(url, callbacks);
}

WebSocketTransport::~WebSocketTransport() {
  clear();
  g_debug("WebSocketTransport destroyed %p", this);
}

void WebSocketTransport::clear() {
  g_debug("WebSocketTransport clear %p", this);
  s_transport = nullptr;
  BaseTransport::clear();
  _ws->Cleanup();
}

void WebSocketTransport::open() {
  if (_state != Closed) {
    jsc_context_throw_printf(jsc_context_get_current(), "Incorrect state 0x%x.",
                             _state);
    return;
  }
  _state = Opening;
  if (!_ws->Connect()) {
    _state = Closed;
    jsc_context_throw(jsc_context_get_current(),
                      "Failed to start WebSocket connection.");
  }
}

void WebSocketTransport::on_open() {
  if (_state != Opening) {
    g_warning("WebSocketTransport unexpected state in on_open 0x%x", _state);
  }
  _state = Open;
  if (_on_open_cb) {
    ExceptionHandler handler{jsc_value_get_context(_on_open_cb)};
    auto result = jsc_value_function_call(_on_open_cb, G_TYPE_NONE);
    if (result) {
      g_object_unref(result);
    }
  }
}

void WebSocketTransport::send(const char *message) {
  if (_state != Open) {
    jsc_context_throw(jsc_context_get_current(), "Incorrect state.");
    return;
  }
  if (!message) {
    jsc_context_throw(jsc_context_get_current(), "Message is null.");
    return;
  }
  if (_enableDebug) {
    g_message("<--%s", message);
  }
  _ws->SendMessage(message);
}

void WebSocketTransport::close() {
  if (_state != Open && _state != Opening) {
    jsc_context_throw(jsc_context_get_current(), "Incorrect state.");
    return;
  }
  _state = Closing;
  _ws->Disconnect();
  _state = Closed;
}

void WebSocketTransport::on_close() {
  _state = Closed;
  if (_on_close_cb) {
    ExceptionHandler handler{jsc_value_get_context(_on_close_cb)};
    auto result = jsc_value_function_call(_on_close_cb, G_TYPE_NONE);
    if (result) {
      g_object_unref(result);
    }
  }
}

void WebSocketTransport::on_message(GBytes *message) {
  if (_state != Open) {
    g_warning("Incorrect state 0x%x.", static_cast<unsigned>(_state));
    return;
  }

  gsize size = 0;
  const gchar *data =
      static_cast<const gchar *>(g_bytes_get_data(message, &size));
  if (!data || size == 0) {
    g_warning("Empty message received.");
    return;
  }

  if (_enableDebug) {
    g_message("-->%s", data);
  }

  if (_on_message_cb) {

    ExceptionHandler handler{jsc_value_get_context(_on_message_cb)};
    JSCValue *value =
        jsc_value_new_string(jsc_value_get_context(_on_message_cb), data);
    if (value) {
      auto result = jsc_value_function_call(_on_message_cb, JSC_TYPE_VALUE,
                                            value, G_TYPE_NONE);
      if (result) {
        g_object_unref(result);
      }
      g_object_unref(value);
    }
  } else {
    g_warning("No on_message callback set or value is null.");
  }
}

void WebSocketTransport::on_error(const char *error) {
  if (_state != Open && _state != Opening) {
    g_warning("WebSocketTransport unexpected state in on_error 0x%x", _state);
  }
  _state = Closed;
  if (_on_error_cb) {
    ExceptionHandler handler{jsc_value_get_context(_on_error_cb)};
    auto result = jsc_value_function_call(_on_error_cb, G_TYPE_STRING, error,
                                          G_TYPE_NONE);
    if (result) {
      g_object_unref(result);
    }
  }
}

int TransportClass::get_state(BaseTransport *transport) {
  return transport->state();
}

void TransportClass::set_onopen(BaseTransport *transport, JSCValue *value) {
  transport->set_on_open_callback(value);
}

JSCValue *TransportClass::get_onopen(BaseTransport *transport) {
  return transport->get_on_open_callback();
}

void TransportClass::set_onmessage(BaseTransport *transport, JSCValue *value) {
  transport->set_on_message_callback(value);
}

JSCValue *TransportClass::get_onmessage(BaseTransport *transport) {
  return transport->get_on_message_callback();
}

void TransportClass::set_onclose(BaseTransport *transport, JSCValue *value) {
  transport->set_on_close_callback(value);
}

JSCValue *TransportClass::get_onclose(BaseTransport *transport) {
  return transport->get_on_close_callback();
}

void TransportClass::set_onerror(BaseTransport *transport, JSCValue *value) {
  transport->set_on_error_callback(value);
}

JSCValue *TransportClass::get_onerror(BaseTransport *transport) {
  return transport->get_on_error_callback();
}

void TransportClass::call_open(BaseTransport *transport) {
  if (!transport) {
    g_critical("Transport is null!");
    return;
  }
  transport->open();
}

void TransportClass::call_send(BaseTransport *transport, const char *message) {
  transport->send(message);
}

void TransportClass::call_close(BaseTransport *transport) {
  transport->close();
}

BaseTransport *TransportClass::create_instance(const char *url,
                                               const bool enableDebug) {
  return new WebSocketTransport(url, enableDebug);
}

void TransportClass::destroy_instance(BaseTransport *transport) {
  if (transport) {
    delete transport;
  }
}

JSCClass *create_transport_class(JSCContext *jsContext) {
  g_debug("Register class in context: %p", jsContext);

  JSCClass *transport_class = jsc_context_register_class(
      jsContext, "Transport", nullptr, nullptr,
      reinterpret_cast<GDestroyNotify>(&TransportClass::destroy_instance));

  // properties
  jsc_class_add_property(transport_class, "state", G_TYPE_INT,
                         G_CALLBACK(&TransportClass::get_state), nullptr,
                         nullptr, nullptr);

  // callbacks
  jsc_class_add_property(transport_class, "onOpen", JSC_TYPE_VALUE,
                         G_CALLBACK(&TransportClass::get_onopen),
                         G_CALLBACK(&TransportClass::set_onopen), nullptr,
                         nullptr);

  jsc_class_add_property(transport_class, "onMessage", JSC_TYPE_VALUE,
                         G_CALLBACK(&TransportClass::get_onmessage),
                         G_CALLBACK(&TransportClass::set_onmessage), nullptr,
                         nullptr);

  jsc_class_add_property(transport_class, "onError", JSC_TYPE_VALUE,
                         G_CALLBACK(&TransportClass::get_onerror),
                         G_CALLBACK(&TransportClass::set_onerror), nullptr,
                         nullptr);

  jsc_class_add_property(transport_class, "onClose", JSC_TYPE_VALUE,
                         G_CALLBACK(&TransportClass::get_onclose),
                         G_CALLBACK(&TransportClass::set_onclose), nullptr,
                         nullptr);

  // methods
  jsc_class_add_method(transport_class, "open",
                       G_CALLBACK(&TransportClass::call_open), nullptr, nullptr,
                       G_TYPE_NONE, 0, G_TYPE_NONE);

  jsc_class_add_method(transport_class, "send",
                       G_CALLBACK(&TransportClass::call_send), nullptr, nullptr,
                       G_TYPE_NONE, 1, G_TYPE_STRING);

  jsc_class_add_method(transport_class, "close",
                       G_CALLBACK(&TransportClass::call_close), nullptr,
                       nullptr, G_TYPE_NONE, 0, G_TYPE_NONE);

  return transport_class;
}