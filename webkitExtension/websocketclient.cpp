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
 
static inline SoupFunctions& soup() {
    return SoupFunctions::get();
}

WebSocketClient::WebSocketClient(const char *url)
    : m_url(g_strdup(url))
{
}

WebSocketClient::~WebSocketClient()
{
    Cleanup();
    g_clear_pointer(&m_url, g_free);
}

void WebSocketClient::Cleanup()
{
    Disconnect();
    // Ensure cancellable is cleaned up even if Disconnect wasn't called
    g_clear_object(&m_cancellable);
}

bool WebSocketClient::Connect(std::function<void(const bool)>&& onConnect,
                              std::function<void(const char*, size_t)>&& onMessage)
{
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
    m_onConnect = std::move(onConnect);
    m_onMessage = std::move(onMessage);

    // Create cancellable for this connection attempt
    m_cancellable = g_cancellable_new();

    auto connectCallback = [](GObject *source_object, GAsyncResult *res, gpointer user_data) {
        WebSocketClient *self = static_cast<WebSocketClient*>(user_data);
        
        // Check if connection was cancelled before dereferencing self
        if (g_cancellable_is_cancelled(self->m_cancellable)) {
            g_printerr("WebSocket connection was cancelled\n");
            g_clear_object(&self->m_cancellable);
            if (self->m_onConnect) {
                self->m_onConnect(false);
            }
            return;
        }

        GError *error = nullptr;
        SoupWebsocketConnection *conn = soup().session_websocket_connect_finish(self->m_session, res, &error);
        
        // Clear the cancellable as the connection attempt is complete
        g_clear_object(&self->m_cancellable);
        
        if (error) {
            g_printerr("WebSocket connection failed: %s\n", error->message);
            g_error_free(error);
            if (self->m_onConnect) {
                self->m_onConnect(false);
            }
            return;
        }
        self->onConnection(conn);
    };

    soup().session_websocket_connect_async(m_session, msg, nullptr, nullptr, G_PRIORITY_DEFAULT, m_cancellable, connectCallback, this);

    g_clear_object(&msg);
    return true;
}

void WebSocketClient::onConnection(SoupWebsocketConnection *ws)
{
    if (!ws)
    {
        g_warning("couldn't establish jsonrpc ws connection.");
        if (m_onConnect) {
            m_onConnect(false);
        }
        return;
    }
    
    // Check if we were cancelled during connection
    if (m_cancellable && g_cancellable_is_cancelled(m_cancellable)) {
        g_warning("Connection was cancelled, ignoring successful connection");
        g_clear_object(&ws);
        if (m_onConnect) {
            m_onConnect(false);
        }
        return;
    }
    
    m_conn = ws;
    g_signal_connect(ws, "message", G_CALLBACK(+[](SoupWebsocketConnection *ws, gint type, GBytes *message, gpointer userData) {
        auto *self = reinterpret_cast<WebSocketClient*>(userData);
        self->onMessage(type, message);
    }), this);
    g_signal_connect(ws, "error", G_CALLBACK(+[](SoupWebsocketConnection *ws, GError *error, gpointer userData) {
        auto *self = reinterpret_cast<WebSocketClient*>(userData);
        self->onError(error);
    }), this);
    g_signal_connect(ws, "closed", G_CALLBACK(+[](SoupWebsocketConnection *ws, gpointer userData) {
        auto *self = reinterpret_cast<WebSocketClient*>(userData);
        self->onClosed();
    }), this);
    m_onConnect(true);
}

void WebSocketClient::onMessage(gint type, GBytes *message)
{
    if (type != SOUP_WEBSOCKET_DATA_TEXT) {
        g_printerr("Received non-text WebSocket message, ignoring\n");
        return;
    }
    gsize sz = 0;
    const void *ptr = g_bytes_get_data(message, &sz);
    if (!ptr || sz == 0) {
        return;
    }
    // Pass the data pointer and size to preserve size information
    // The callback is responsible for handling the data appropriately
    if (m_onMessage) {
        m_onMessage(static_cast<const char*>(ptr), sz);
    }
}

void WebSocketClient::onError(GError *error)
{
    g_warning("error detected - %s", error ? error->message : "unknown");
    if (m_onConnect) {
        m_onConnect(false);
    }
}

void WebSocketClient::onClosed()
{
    g_info("ws connection closed");
    if (m_onConnect) {
        m_onConnect(false);
    }
}

void WebSocketClient::SendMessage(const char* jsMessage)
{
    if (!m_conn) {
        g_printerr("Cannot send message, WebSocket connection is not established\n");
        return;
    }
    soup().websocket_connection_send_text(m_conn, jsMessage);
}

void WebSocketClient::Disconnect()
{
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
    if (m_onConnect) {
        m_onConnect(false);
    }
}