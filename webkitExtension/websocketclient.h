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

 #ifndef WEBSOCKETCLIENT_H
 #define WEBSOCKETCLIENT_H

 #include <wpe/webkit-web-extension.h>
 #include "soupfunctions.h"
 #include <functional>

struct WebSocketCallback {
    std::function<void(GBytes*)> onMessage;
    std::function<void()> onOpen;
    std::function<void(const char*)> onError;
    std::function<void()> onClosed;
};

class WebSocketClient
{
public:
    WebSocketClient(const char *url, WebSocketCallback callbacks);
    ~WebSocketClient();

    bool Connect();
    
    void SendMessage(const char* jsMessage);

    void Disconnect();

    void Cleanup();


private:
    char *m_url;
    WebSocketCallback m_callbacks;

    SoupSession *m_session { nullptr };
    SoupWebsocketConnection *m_conn { nullptr };
    GCancellable *m_cancellable { nullptr };

    void onConnection(SoupWebsocketConnection *ws);
    void onMessage(gint type, GBytes *message);
    void onError(GError *error);
    void onClosed();
};

#endif // WEBSOCKETCLIENT_H