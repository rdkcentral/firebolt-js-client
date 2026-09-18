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

#ifndef WSTRANSPORT_H
#define WSTRANSPORT_H

#include "websocketclient.h"
#include <glib.h>
#include <jsc/jsc.h>
#include <memory>
#include <string>

class ExceptionHandler final {
public:
  ExceptionHandler(JSCContext *context);
  ~ExceptionHandler();
  void pop();

private:
  JSCContext *_context;
};

class BaseTransport {
protected:
  enum State : int {
    Closed = 1,
    Closing = 2,
    Opening = 3,
    Open = 4,
  };

  State _state{Closed};

  JSCValue *_on_open_cb{nullptr};
  JSCValue *_on_close_cb{nullptr};
  JSCValue *_on_error_cb{nullptr};
  JSCValue *_on_message_cb{nullptr};

  bool check_callback(JSCValue *cb);

public:
  BaseTransport();
  virtual ~BaseTransport();
  void clear();
  int state() const;

  JSCValue *get_on_open_callback() const;
  void set_on_open_callback(JSCValue *cb);

  JSCValue *get_on_message_callback() const;
  void set_on_message_callback(JSCValue *cb);

  JSCValue *get_on_error_callback() const;
  void set_on_error_callback(JSCValue *cb);

  JSCValue *get_on_close_callback() const;
  void set_on_close_callback(JSCValue *cb);

  virtual void open() = 0;
  virtual void close() = 0;
  virtual void send(const char *message) = 0;
};

class WebSocketTransport : public BaseTransport {
private:
  std::unique_ptr<WebSocketClient> _ws;
  bool _enableDebug;

public:
  explicit WebSocketTransport(const char *url, const bool enableDebug);

  ~WebSocketTransport() override;

  void clear();

  void open() override;

  void close() override;

  void send(const char *message) override;

  void on_open();

  void on_close();

  void on_message(GBytes *message);

  void on_error(const char *error);

  static WebSocketTransport *s_transport;
};

struct TransportClass {
  static int get_state(BaseTransport *transport);

  static void set_onopen(BaseTransport *transport, JSCValue *value);

  static JSCValue *get_onopen(BaseTransport *transport);

  static void set_onmessage(BaseTransport *transport, JSCValue *value);

  static JSCValue *get_onmessage(BaseTransport *transport);

  static void set_onclose(BaseTransport *transport, JSCValue *value);

  static JSCValue *get_onclose(BaseTransport *transport);

  static void set_onerror(BaseTransport *transport, JSCValue *value);

  static JSCValue *get_onerror(BaseTransport *transport);

  static void call_open(BaseTransport *transport);

  static void call_send(BaseTransport *transport, const char *message);

  static void call_close(BaseTransport *transport);

  static BaseTransport *create_instance(const char *url,
                                        const bool enableDebug);

  static void destroy_instance(BaseTransport *transport);
};

JSCClass *create_transport_class(JSCContext *jsContext);

#endif // WSTRANSPORT_H