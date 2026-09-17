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

#include "websocketclient.h"
#include <glib.h>

static inline SoupFunctions &soup() { return SoupFunctions::get(); }

WebSocketClient::WebSocketClient(const char *url, WebSocketCallback callbacks)
    : m_url(g_strdup(url)), m_callbacks(callbacks) {
  if (!m_callbacks.onMessage || !m_callbacks.onOpen || !m_callbacks.onError ||
      !m_callbacks.onClosed) {
    g_printerr("WebSocketClient: Missing required callbacks\n");
    return;
  }
}

WebSocketClient::~WebSocketClient() {
  Cleanup();
  g_clear_pointer(&m_url, g_free);
}

void WebSocketClient::Cleanup() {
  Disconnect();
  // Ensure cancellable is cleaned up even if Disconnect wasn't called
  g_clear_object(&m_cancellable);
}

bool WebSocketClient::Connect() {
  if (m_session) {
    g_message("Cleaning up existing session\n");
    g_clear_object(&m_session);
  }
  m_session = soup().session_new();
  if (!m_session) {
    g_printerr("Failed to create SoupSession\n");
    return false;
  }
  SoupMessage *msg = soup().message_new("GET", m_url);
  if (!msg) {
    g_printerr("Failed to create SoupMessage\n");
    g_clear_object(&m_session);
    return false;
  }
  // Create cancellable for this connection attempt
  m_cancellable = g_cancellable_new();

  auto connectCallback = [](GObject *session, GAsyncResult *res,
                            gpointer user_data) {
    GError *err = nullptr;
    SoupWebsocketConnection *conn = soup().session_websocket_connect_finish(
        SOUP_SESSION(session), res, &err);
    if (err) {
      if (g_error_matches(err, G_IO_ERROR, G_IO_ERROR_CANCELLED)) {
        // cancelled, do nothing
        g_error_free(err);
        return;
      } else {
        g_printerr("WebSocket connection failed: %s\n", err->message);
        g_error_free(err);
        WebSocketClient *self = static_cast<WebSocketClient *>(user_data);
        self->m_callbacks.onError("WebSocket connection failed");
        if (g_cancellable_is_cancelled(self->m_cancellable)) {
          g_printerr("WebSocket connection was cancelled\n");
        }

        // Clear the cancellable as the connection attempt is complete
        g_clear_object(&self->m_cancellable);
        return;
      }
    } else {
      WebSocketClient *self = static_cast<WebSocketClient *>(user_data);
      self->onConnection(conn);
      return;
    }
  };
  soup().session_websocket_connect_async(m_session, msg, nullptr, nullptr,
                                         G_PRIORITY_DEFAULT, m_cancellable,
                                         connectCallback, this);

  g_clear_object(&msg);
  return true;
}

void WebSocketClient::onConnection(SoupWebsocketConnection *ws) {
  if (!ws) {
    g_warning("couldn't establish jsonrpc ws connection.");
    m_callbacks.onError("couldn't establish jsonrpc ws connection");
    return;
  }
  // Check if we were cancelled during connection
  if (m_cancellable && g_cancellable_is_cancelled(m_cancellable)) {
    g_warning("Connection was cancelled, ignoring successful connection");
    g_clear_object(&ws);
    return;
  }
  m_conn = ws;
  g_signal_connect(ws, "message",
                   G_CALLBACK(+[](SoupWebsocketConnection *ws, gint type,
                                  GBytes *message, gpointer userData) {
                     auto *self = reinterpret_cast<WebSocketClient *>(userData);
                     self->onMessage(type, message);
                   }),
                   this);
  g_signal_connect(ws, "error",
                   G_CALLBACK(+[](SoupWebsocketConnection *ws, GError *error,
                                  gpointer userData) {
                     auto *self = reinterpret_cast<WebSocketClient *>(userData);
                     self->onError(error);
                   }),
                   this);
  g_signal_connect(
      ws, "closed",
      G_CALLBACK(+[](SoupWebsocketConnection *ws, gpointer userData) {
        auto *self = reinterpret_cast<WebSocketClient *>(userData);
        self->onClosed();
      }),
      this);
  m_callbacks.onOpen();
}

void WebSocketClient::onMessage(gint type, GBytes *message) {
  if (type != SOUP_WEBSOCKET_DATA_TEXT) {
    g_printerr("Received non-text WebSocket message, ignoring\n");
    return;
  }
  m_callbacks.onMessage(message);
}

void WebSocketClient::onError(GError *error) {
  g_warning("error detected - %s", error ? error->message : "unknown");
  m_callbacks.onError(error ? error->message : "unknown");
}

void WebSocketClient::onClosed() {
  g_message("ws connection closed");
  m_callbacks.onClosed();
}

void WebSocketClient::SendMessage(const char *jsMessage) {
  if (!m_conn) {
    g_printerr(
        "Cannot send message, WebSocket connection is not established\n");
    return;
  }
  soup().websocket_connection_send_text(m_conn, jsMessage);
}

void WebSocketClient::Disconnect() {
  // Cancel any ongoing connection attempt
  if (m_cancellable) {
    g_cancellable_cancel(m_cancellable);
    g_clear_object(&m_cancellable);
  }

  if (m_conn) {
    soup_websocket_connection_close(m_conn, 1000, "Normal Closure");
    g_clear_object(&m_conn);
  }
  g_clear_object(&m_session);
}