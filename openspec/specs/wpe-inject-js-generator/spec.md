## ADDED Requirements

### Requirement: Bundle exposes a frozen FireboltServiceManager global
The inject-js generator SHALL emit a self-contained IIFE that:
1. Constructs the `FireboltServiceManager` object and calls `Object.freeze()` on it (prevents adding, modifying, or deleting properties of the object itself).
2. Attaches it to `global` using `Object.defineProperty(global, "FireboltServiceManager", { value: <frozen_fsm>, writable: false, configurable: false, enumerable: true })` so the global property itself cannot be reassigned or deleted from page JavaScript.

The object MUST have exactly three members: `version` (string), `transport` (function), and `get` (function).

> Note: `Object.freeze()` alone is sufficient for `FireboltClient` and its module namespace objects because they are returned values, not global properties. `Object.defineProperty` is required only for the `FireboltServiceManager` global attachment.

#### Scenario: FireboltServiceManager is frozen after injection
- **WHEN** the generated bundle is evaluated
- **THEN** `Object.isFrozen(FireboltServiceManager)` MUST return `true`
- **THEN** `FireboltServiceManager.version` MUST equal the semver string from `CanonicalAST.version`
- **THEN** `typeof FireboltServiceManager.transport` MUST equal `"function"`
- **THEN** `typeof FireboltServiceManager.get` MUST equal `"function"`

#### Scenario: FireboltServiceManager cannot be mutated
- **WHEN** code attempts `FireboltServiceManager.newProp = 1` or `delete FireboltServiceManager.version`
- **THEN** the property MUST not be changed (silently fails in non-strict; throws `TypeError` in strict)

#### Scenario: FireboltServiceManager global property cannot be replaced
- **WHEN** code attempts `window.FireboltServiceManager = null` or `delete window.FireboltServiceManager`
- **THEN** the global property MUST remain pointing to the original frozen object (writable: false, configurable: false via `Object.defineProperty`)

---

### Requirement: transport() injects the transport for message handling
`FireboltServiceManager.transport(t)` SHALL:
1. Accept a transport object `t` with methods: `send(msg)`, `onMessage(callback)`, `onConnectionStatus(callback)`, `connect()`, and `disconnect()`.
2. Store the transport privately in IIFE closure (not accessible from page code).
3. Throw an `Error` if called more than once (one-time injection guard).
4. MUST NOT attempt to call any transport methods during injection; only store the reference.

#### Scenario: transport() accepts and stores the transport object
- **WHEN** `FireboltServiceManager.transport(t)` is called with a valid transport
- **THEN** no error MUST be thrown
- **THEN** subsequent `get()` calls MUST use the injected transport

#### Scenario: transport() throws on double injection
- **WHEN** `FireboltServiceManager.transport(t1)` is called, then `FireboltServiceManager.transport(t2)` is called
- **THEN** the second call MUST throw an `Error` with a message indicating transport is already set

#### Scenario: transport() does not validate transport methods during injection
- **WHEN** `FireboltServiceManager.transport(t)` is called with an invalid or incomplete transport object
- **THEN** no error MUST be thrown during injection
- **THEN** errors MUST surface when methods are first called (e.g., during `get()`)

---

### Requirement: get() initialises transport connection and returns a Promise
`FireboltServiceManager.get()` SHALL:
1. Throw a synchronous `Error` if `transport()` has not been called.
2. On first call: register `onMessage` and `onConnectionStatus` callbacks with the injected transport, then call `connect()`.
3. Return a `Promise` that resolves to the singleton `FireboltClient` object once the transport emits `"connected"`.
4. On subsequent calls while connection is in progress: return a new `Promise` that also resolves to the same singleton instance when `"connected"` fires.
5. Once connected: return `Promise.resolve(<singleton>)` immediately.

#### Scenario: get() before transport() throws
- **WHEN** `FireboltServiceManager.get()` is called before `transport()`
- **THEN** a synchronous `Error` MUST be thrown with a message indicating transport must be set first

#### Scenario: get() resolves after connection is established
- **WHEN** `transport(t)` has been called and `get()` is invoked
- **THEN** the returned Promise MUST resolve only after the transport emits `"connected"`
- **THEN** the resolved value MUST be the frozen FireboltClient object

#### Scenario: Multiple get() callers share the same instance
- **WHEN** `get()` is called twice before the connection is established
- **THEN** both Promises MUST resolve with the same object reference

#### Scenario: get() after connection resolves immediately
- **WHEN** `get()` is called after the transport is already connected
- **THEN** the returned Promise MUST resolve in the same microtask turn with the existing singleton

---

### Requirement: FireboltClient is a frozen module-namespaced object
The `FireboltClient` returned by `get()` SHALL be a frozen object whose properties are the PascalCase module names of all `web` and `both` platform modules in the Canonical AST. Each module property SHALL itself be a frozen object containing the module's methods. The top-level `FireboltClient` and all module namespace objects MUST be immutable.

#### Scenario: FireboltClient has expected module namespaces
- **WHEN** the AST contains modules `Accessibility` (platform: "both") and `Localization` (platform: "both")
- **THEN** `firebolt.Accessibility` MUST exist
- **THEN** `firebolt.Localization` MUST exist
- **THEN** `Object.isFrozen(firebolt)` MUST return `true`
- **THEN** `Object.isFrozen(firebolt.Accessibility)` MUST return `true`

#### Scenario: Native-only modules are excluded
- **WHEN** the AST contains a module with `platform: "native"`
- **THEN** that module MUST NOT appear as a property on the FireboltClient

---

### Requirement: Call method stubs send JSON-RPC without clientId
Each `kind: "call"` method stub SHALL:
1. Allocate a unique integer `id` and send `{ jsonrpc:"2.0", id, method:"Module.methodName", params }` via `transport.send(msg)` (no clientId argument).
2. On receiving `{ id, result }`: resolve the Promise with the result value (no validation).
3. On receiving `{ id, error }`: reject the Promise with an `Error` constructed from `error.message` and `error.code`.

#### Scenario: Call method sends params without clientId
- **WHEN** a call stub is invoked with params
- **THEN** the transport SHALL receive `{ jsonrpc:"2.0", id, method, params }` immediately
- **THEN** no clientId argument MUST be passed to transport.send()

#### Scenario: Call method resolves with result
- **WHEN** the backend responds with `{ id, result: <value> }`
- **THEN** the returned Promise MUST resolve with the result value as-is (no validation)

#### Scenario: Call method rejects on backend error
- **WHEN** the backend responds with `{ id, error: { code: -32602, message: "Invalid params" } }`
- **THEN** the returned Promise MUST reject with an Error whose message includes the backend error message and code

---

### Requirement: Subscribe stubs register callbacks and await backend confirmation without clientId
Each `kind: "subscribe"` method stub SHALL:
1. Register the user callback in the internal `_eventListeners` map eagerly (before sending).
2. Send `{ jsonrpc:"2.0", id, method:"Module.onEventName", params:{ listen:true } }` via `transport.send(msg)` (no clientId argument).
3. Return a `Promise` that resolves with a synchronous unsubscribe function only when the backend confirms with `{ id, result: null }`.
4. On backend error response: remove the eagerly-registered callback, reject the Promise.
5. On transport send failure: remove the callback, reject the Promise.

#### Scenario: Subscribe sends params without clientId
- **WHEN** a subscribe stub is invoked
- **THEN** the transport SHALL receive `{ jsonrpc:"2.0", id, method, params: { listen: true } }`
- **THEN** no clientId argument MUST be passed to transport.send()

#### Scenario: Subscribe resolves with unsubscribe function after ack
- **WHEN** the backend responds with `{ id, result: null }` for a subscribe request
- **THEN** the Promise MUST resolve
- **THEN** the resolved value MUST be a function (the unsubscribe function)

#### Scenario: Subscribe rejects on backend error
- **WHEN** the backend responds with `{ id, error: { code: 403, message: "Forbidden" } }`
- **THEN** the Promise MUST reject
- **THEN** the callback MUST be removed from `_eventListeners`

#### Scenario: Calling unsubscribe removes the callback
- **WHEN** the resolved unsubscribe function is called
- **THEN** the callback MUST be removed from `_eventListeners`
- **THEN** if no other callbacks remain for that event, `{ listen: false }` MUST be sent to the backend

---

### Requirement: FireboltClient has a disconnect() method
The `FireboltClient` returned by `get()` SHALL include a `disconnect()` method that:
1. Calls `transport.disconnect()` on the injected transport.
2. Clears all event listeners in `_eventListeners`.
3. Rejects all pending call Promises with a DisconnectError.
4. Resets the internal connection state flags (`_connecting=false`, `_connected=false`).
5. Clears the singleton reference so that subsequent `get()` calls can reconnect.

#### Scenario: disconnect() clears state and calls transport
- **WHEN** `firebolt.disconnect()` is called while connected
- **THEN** `transport.disconnect()` MUST be called
- **THEN** all event listeners MUST be cleared
- **THEN** the internal state MUST be reset

#### Scenario: Pending calls are rejected on disconnect
- **WHEN** a call Promise is pending and `firebolt.disconnect()` is called
- **THEN** the pending call Promise MUST reject with a DisconnectError

#### Scenario: get() after disconnect() initiates fresh connection
- **WHEN** `firebolt.disconnect()` has been called and `get()` is invoked again
- **THEN** the transport MUST be reconnected
- **THEN** a new singleton FireboltClient MUST be created and returned

---

### Requirement: Event notifications are routed by method field
Incoming messages with a `method` field and no `id` field SHALL be treated as Firebolt 9 event notifications. The runtime SHALL:
1. Look up the event in `_methodRegistry`.
2. Extract the payload: if `eventIsPrimitive` is `true`, extract `params.value`; otherwise use `params` directly.
3. Dispatch the payload to all registered callbacks in `_eventListeners[method]` (no validation).

#### Scenario: Primitive event payload extracted from params.value
- **WHEN** a notification `{ method:"Localization.onCountryChanged", params:{ value:"US" } }` arrives
- **THEN** the callback MUST receive `"US"` (not `{ value: "US" }`)

#### Scenario: Object event payload passed as params directly
- **WHEN** a notification `{ method:"SomeModule.onSomeChanged", params:{ key:"val" } }` arrives and `eventIsPrimitive` is `false`
- **THEN** the callback MUST receive `{ key:"val" }`

#### Scenario: Array event payload passed as params directly
- **WHEN** a notification `{ method:"SomeModule.onListChanged", params:["a","b"] }` arrives and `eventIsPrimitive` is `false`
- **THEN** the callback MUST receive `["a","b"]` (not `{ value: ["a","b"] }`)

---

### Requirement: Generated bundle targets web-platform modules only
The inject-js generator SHALL include only modules whose `platform` is `"web"` or `"both"` in the `_methodRegistry` and the `FireboltClient` namespace. Modules with `platform: "native"` SHALL be silently excluded.

#### Scenario: web module is included
- **WHEN** the AST contains a module with `platform: "web"`
- **THEN** that module's methods MUST appear in `_methodRegistry`
- **THEN** that module MUST appear as a namespace on the FireboltClient

#### Scenario: native module is excluded
- **WHEN** the AST contains a module with `platform: "native"`
- **THEN** that module's methods MUST NOT appear in `_methodRegistry`
- **THEN** that module MUST NOT appear on the FireboltClient

---

### Requirement: Bundle version is derived from CanonicalAST.version
The `_VERSION` constant in the generated bundle SHALL equal the `version` string from the `CanonicalAST` (which originates from the OpenRPC `info.version` field of the processed documents).

#### Scenario: version matches OpenRPC version
- **WHEN** the OpenRPC documents carry `info.version: "9.0"`
- **THEN** `FireboltServiceManager.version` MUST equal `"9.0"`
