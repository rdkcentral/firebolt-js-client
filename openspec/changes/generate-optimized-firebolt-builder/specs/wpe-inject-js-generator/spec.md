## ADDED Requirements

### Requirement: Generator emits a WebKit builder profile from the Canonical AST
The inject-js generator SHALL provide a WebKit builder profile that uses the same Canonical AST and method-stub generation rules as the regular inject-js target. The WebKit profile SHALL include only modules and methods whose platform is `web` or `both`, and SHALL NOT maintain a separate hand-authored API list.

#### Scenario: API additions flow into both generated targets
- **WHEN** a call or subscribe method is added to a web or both-platform API and the Canonical AST is rebuilt
- **THEN** the regular inject-js target and WebKit builder profile MUST both expose that method using the applicable generated parameter pattern

#### Scenario: Native-only methods are excluded from the WebKit profile
- **WHEN** a method is marked native-only in the Canonical AST
- **THEN** the WebKit builder profile MUST NOT expose that method

#### Scenario: WebKit profile preserves the extension factory contract
- **WHEN** the WebKit builder profile is evaluated by the WebKit JavaScriptCore context
- **THEN** evaluation MUST return the factory function expected by `evaluate_builder_script`
- **THEN** calling the factory with `{ transport, extensionSchema, enableDebug }` MUST return an object with a `build()` method
- **THEN** the profile MUST NOT require the `FireboltServiceManager` bridge to be regenerated

## MODIFIED Requirements

### Requirement: Transport interface uses send, open, close with callback properties
The factory function SHALL require a transport object with methods `send(msg)` and `open()`. A `close()` method MAY be present but SHALL NOT be required or invoked by the client. The transport SHALL have callback properties `onMessage`, `onOpen`, `onClose`, and `onError` that are set by the factory.

#### Scenario: Transport validation requires only send and open
- **WHEN** the factory function validates the transport
- **THEN** it MUST check for `send` and `open` methods
- **THEN** it MUST throw an Error if either required method is missing or not a function
- **THEN** it MUST accept a transport without a `close` method

#### Scenario: Factory sets transport callback properties
- **WHEN** the `build()` method is called
- **THEN** it MUST set `_transport.onMessage` to the internal message handler
- **THEN** it MUST set `_transport.onOpen` to the internal open handler
- **THEN** it MUST set `_transport.onClose` to the internal close handler
- **THEN** it MUST set `_transport.onError` to the internal error handler

#### Scenario: Connection management uses onOpen/onClose
- **WHEN** the transport calls `onOpen()`
- **THEN** the internal state MUST set `_connected = true`
- **THEN** it MUST build the FireboltClient instance
- **THEN** it MUST resolve all pending connection promises
- **WHEN** the transport calls `onClose()`
- **THEN** the internal state MUST set `_connected = false`

#### Scenario: Auto-reconnect on error
- **WHEN** the transport calls `onError(error)`
- **THEN** it MUST clear pending calls
- **THEN** it MUST clear event listeners with cancellation
- **THEN** it MUST set `_connected = false`
- **THEN** it MUST attempt to reconnect by calling `_connect()`

### Requirement: FireboltClient has a cleanup() method
The `FireboltClient` returned by `build()` SHALL include a `cleanup()` method that:
1. Calls `clearEventListeners()` to notify all listeners with `(null, true)`.
2. Calls `clearPendingCalls()` to reject all pending call Promises.
3. Preserves the transport, transport callback handlers, connection state, connection resolvers, and singleton FireboltClient.
4. Does not call `transport.close()`.

#### Scenario: cleanup() clears client listeners and pending calls without closing transport
- **WHEN** `firebolt.cleanup()` is called while connected
- **THEN** all event listeners MUST be called with `(null, true)`
- **THEN** all pending calls MUST be rejected
- **THEN** the transport MUST remain open and its callback handlers MUST remain installed
- **THEN** the connected state and FireboltClient singleton MUST be preserved

#### Scenario: Pending calls are rejected on cleanup
- **WHEN** a call Promise is pending and `firebolt.cleanup()` is called
- **THEN** the pending call Promise MUST reject with an Error

#### Scenario: Calls continue on the existing connection after cleanup
- **WHEN** `firebolt.cleanup()` has been called while the transport remains connected
- **THEN** subsequent API calls MUST use the existing transport without reopening it
- **THEN** `build()` MUST return the existing singleton FireboltClient