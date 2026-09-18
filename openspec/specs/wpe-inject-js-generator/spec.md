## ADDED Requirements

### Requirement: Bundle exposes a factory function
The inject-js generator SHALL emit a self-contained IIFE that returns a factory function. The factory function accepts a configuration object with `transport`, `extensionSchema`, and `enableDebug` properties and returns a builder object with a `build()` method.

#### Scenario: Factory function accepts configuration
- **WHEN** the generated bundle is evaluated and called with `{ transport, extensionSchema, enableDebug }`
- **THEN** it MUST return an object with a `build()` method
- **THEN** the `build()` method MUST return a Promise that resolves to the FireboltClient

#### Scenario: Factory function validates transport
- **WHEN** the factory function is called without a transport
- **THEN** it MUST throw an Error with message "Transport is required"
- **WHEN** the factory function is called with an invalid transport
- **THEN** it MUST throw an Error indicating missing required methods

#### Scenario: Factory function parses extension schema
- **WHEN** the factory function is called with a valid extensionSchema JSON string
- **THEN** it MUST parse the JSON and store it for later use
- **WHEN** the factory function is called with invalid extensionSchema JSON
- **THEN** it MUST log a warning and continue without extension schema

#### Scenario: Factory function enables debug mode
- **WHEN** the factory function is called with `enableDebug: true`
- **THEN** it MUST enable debug logging
- **THEN** it MUST expose the transport globally as `window.___fireboltTransport___`

---

### Requirement: Transport interface uses send, open, close with callback properties
The factory function SHALL accept a transport object with methods `send(msg)`, `open()`, and `close()`. The transport SHALL have callback properties `onMessage`, `onOpen`, `onClose`, and `onError` that are set by the factory.

#### Scenario: Transport validation checks required methods
- **WHEN** the factory function validates the transport
- **THEN** it MUST check for `send`, `open`, and `close` methods
- **THEN** it MUST throw an Error if any required method is missing or not a function

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

---

### Requirement: build() method initializes connection and returns Promise
The builder object's `build()` method SHALL:
1. Return a Promise that resolves to the singleton FireboltClient object once the transport emits `onOpen()`.
2. On subsequent calls while connection is in progress: return a new Promise that also resolves to the same singleton instance when `onOpen()` fires.
3. Once connected: return `Promise.resolve(<singleton>)` immediately.
4. Set transport callback properties on first call only.

#### Scenario: build() resolves after connection is established
- **WHEN** the `build()` method is called
- **THEN** the returned Promise MUST resolve only after the transport calls `onOpen()`
- **THEN** the resolved value MUST be the frozen FireboltClient object

#### Scenario: Multiple build() callers share the same instance
- **WHEN** `build()` is called twice before the connection is established
- **THEN** both Promises MUST resolve with the same object reference

#### Scenario: build() after connection resolves immediately
- **WHEN** `build()` is called after the transport is already connected
- **THEN** the returned Promise MUST resolve in the same microtask turn with the existing singleton

#### Scenario: build() sets callbacks only once
- **WHEN** `build()` is called multiple times
- **THEN** transport callback properties MUST be set only on the first call
- **THEN** subsequent calls MUST not overwrite the callback properties

---

### Requirement: FireboltClient is a frozen module-namespaced object
The `FireboltClient` returned by `build()` SHALL be a frozen object whose properties are the PascalCase module names of all `web` and `both` platform modules in the Canonical AST. Each module property SHALL itself be a frozen object containing the module's methods. The top-level `FireboltClient` and all module namespace objects MUST be immutable.

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

### Requirement: Methods are generated statically using Object.defineProperty
The inject-js generator SHALL generate static module definitions using `Object.defineProperty` for each method and event at generation time, rather than building modules dynamically from a registry at runtime.

#### Scenario: Static method generation uses Object.defineProperty
- **WHEN** the generator processes a method
- **THEN** it MUST emit an `Object.defineProperty` call for that method
- **THEN** the property MUST have `writable: false`, `enumerable: true`, `configurable: false`

#### Scenario: Static event generation uses Object.defineProperty
- **WHEN** the generator processes an event
- **THEN** it MUST emit an `Object.defineProperty` call for that event
- **THEN** the property MUST have `writable: false`, `enumerable: true`, `configurable: false`

#### Scenario: Module registration uses Object.defineProperty
- **WHEN** the generator completes a module
- **THEN** it MUST emit an `Object.defineProperty` call to register the module
- **THEN** the property MUST have `writable: false`, `enumerable: true`, `configurable: false`

---

### Requirement: Call method stubs send JSON-RPC without clientId
Each `kind: "call"` method stub SHALL:
1. Allocate a unique integer `id` and send `{ jsonrpc:"2.0", id, method:"Module.methodName", params }` via `transport.send(msg)` (no clientId argument).
2. On receiving `{ id, result }`: resolve the Promise with the result value (no validation).
3. On receiving `{ id, error }`: reject the Promise with an `Error` constructed from `error.message` and `error.code`.
4. The inject-js generator SHALL produce three distinct parameter patterns based on the method's parameter structure:
   - **No-param methods** (paramCount === 0): Generate stubs that accept no arguments and send empty params object
   - **Single-param methods** (paramCount >= 1): Generate stubs that accept a single parameter (primitive or object) and send it as params
   - **Single-primitive-wrap methods** (exactly 1 param, object type, exactly 1 required primitive property): Generate stubs that accept a single primitive value and wrap it in an object with the property name

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

#### Scenario: No-param method stub accepts no arguments
- **WHEN** a method with paramCount === 0 is invoked without arguments
- **THEN** the method MUST be callable as `Module.method()`
- **THEN** the generated stub MUST send `{ jsonrpc:"2.0", id, method, params: {} }` to the transport

#### Scenario: Single-param method stub accepts object value
- **WHEN** a method with paramCount >= 1 is invoked with an object
- **THEN** the method MUST be callable as `Module.method({ param1: value1, param2: value2 })`
- **THEN** the generated stub MUST send the object as the params field to the transport

---

### Requirement: Event listeners use two-parameter signature with cancellation
Each `kind: "subscribe"` method stub SHALL:
1. Register the user callback in the internal `_eventListeners` map eagerly (before sending).
2. Send `{ jsonrpc:"2.0", id, method:"Module.onEventName", params:{ listen:true } }` via `transport.send(msg)` (no clientId argument).
3. Return a `Promise` that resolves with a synchronous unsubscribe function only when the backend confirms with `{ id, result: null }`.
4. On backend error response: remove the eagerly-registered callback, reject the Promise.
5. On transport send failure: remove the callback, reject the Promise.
6. Event callbacks SHALL accept two parameters: `(object, cancelled: bool)` where cancelled is true on connection failures.

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

#### Scenario: Event callback receives two parameters
- **WHEN** an event notification arrives
- **THEN** the callback MUST be called with `(payload, false)`
- **THEN** the first parameter MUST be the event payload
- **THEN** the second parameter MUST be false for normal events

#### Scenario: Event callback receives cancellation signal
- **WHEN** event listeners are cleared due to connection failure
- **THEN** each callback MUST be called with `(null, true)`
- **THEN** the first parameter MUST be null
- **THEN** the second parameter MUST be true to indicate cancellation

---

### Requirement: Event notifications are routed by method field
Incoming messages with a `method` field and no `id` field SHALL be treated as Firebolt 9 event notifications. The runtime SHALL:
1. Look up the event in the internal event listener map.
2. Extract the payload: if `params` has a `value` property, extract `params.value`; otherwise use `params` directly.
3. Dispatch the payload to all registered callbacks in `_eventListeners[method]` with `(payload, false)` (no validation).

#### Scenario: Primitive event payload extracted from params.value
- **WHEN** a notification `{ method:"Localization.onCountryChanged", params:{ value:"US" } }` arrives
- **THEN** the callback MUST receive `("US", false)` (not `{ value: "US" }`)

#### Scenario: Object event payload passed as params directly
- **WHEN** a notification `{ method:"SomeModule.onSomeChanged", params:{ key:"val" } }` arrives
- **THEN** the callback MUST receive `({ key:"val" }, false)`

#### Scenario: Array event payload passed as params directly
- **WHEN** a notification `{ method:"SomeModule.onListChanged", params:["a","b"] }` arrives
- **THEN** the callback MUST receive `(["a","b"], false)`

---

### Requirement: FireboltClient has a cleanup() method
The `FireboltClient` returned by `build()` SHALL include a `cleanup()` method that:
1. Calls `clearEventListeners()` to notify all listeners with `(null, true)`.
2. Calls `clearPendingCalls()` to reject all pending call Promises.
3. Resets the internal connection state flags (`_connecting=false`, `_connected=false`).
4. Calls `transport.close()` if available.
5. Clears the singleton reference.

#### Scenario: cleanup() clears state and calls transport
- **WHEN** `firebolt.cleanup()` is called while connected
- **THEN** `transport.close()` MUST be called if available
- **THEN** all event listeners MUST be called with `(null, true)`
- **THEN** all pending calls MUST be rejected
- **THEN** the internal state MUST be reset

#### Scenario: Pending calls are rejected on cleanup
- **WHEN** a call Promise is pending and `firebolt.cleanup()` is called
- **THEN** the pending call Promise MUST reject with an Error

#### Scenario: build() after cleanup() initiates fresh connection
- **WHEN** `firebolt.cleanup()` has been called and `build()` is invoked again
- **THEN** the transport MUST be reconnected
- **THEN** a new singleton FireboltClient MUST be created and returned

---

### Requirement: Extension schema loading supports dynamic API extension
The factory function SHALL support dynamic extension schema loading via the `extensionSchema` parameter. The extension schema is a JSON string array that allows app developers to extend the Firebolt API with custom modules and methods.

#### Scenario: Extension schema format is validated
- **WHEN** extensionSchema is provided as a JSON string
- **THEN** it MUST be parsed and validated as an array
- **THEN** each element MUST have a `name` property (string)
- **THEN** each element MAY have `methods`, `events`, and `methodsWithObject` properties (arrays of strings)

#### Scenario: Extension methods are added to registry
- **WHEN** extension schema includes methods for a module
- **THEN** those methods MUST be added to the module using `_addMethodNoParams`
- **THEN** methods MUST not overwrite existing methods

#### Scenario: Extension events are added to registry
- **WHEN** extension schema includes events for a module
- **THEN** those events MUST be added to the module using `_addEvent`
- **THEN** events MUST not overwrite existing events

#### Scenario: Extension methods with object params are added to registry
- **WHEN** extension schema includes methodsWithObject for a module
- **THEN** those methods MUST be added to the module using `_addMethodWithObjectParam`
- **THEN** methods MUST not overwrite existing methods

#### Scenario: Extension methods with primitive-wrap pattern are added to registry
- **WHEN** extension schema includes methods that match the single-primitive-wrap pattern
- **THEN** those methods MUST be added to the module using `_addMethodWithPrimitiveWrap`
- **THEN** methods MUST not overwrite existing methods

#### Scenario: Extension modules are registered
- **WHEN** extension schema includes a new module name
- **THEN** that module MUST be registered in the FireboltClient
- **WHEN** extension schema extends an existing module
- **THEN** the existing module MUST be extended with new methods/events

---

### Requirement: Debug mode provides logging and transport exposure
The factory function SHALL support an optional `enableDebug` flag that enables console logging and exposes the transport globally for debugging purposes.

#### Scenario: Debug mode enables message logging
- **WHEN** `enableDebug: true` is provided
- **THEN** incoming messages MUST be logged to console with "-->" prefix
- **THEN** outgoing messages MUST be logged to console with "<--" prefix

#### Scenario: Debug mode exposes transport globally
- **WHEN** `enableDebug: true` is provided
- **THEN** the transport MUST be exposed as `window.___fireboltTransport___`

#### Scenario: Debug mode is disabled by default
- **WHEN** `enableDebug` is not provided or is false
- **THEN** no message logging MUST occur
- **THEN** the transport MUST NOT be exposed globally

---

### Requirement: Generated bundle targets web-platform modules only
The inject-js generator SHALL include only modules whose `platform` is `"web"` or `"both"` in the static module generation. Modules with `platform: "native"` SHALL be silently excluded.

#### Scenario: web module is included
- **WHEN** the AST contains a module with `platform: "web"`
- **THEN** that module's methods MUST be generated with static Object.defineProperty calls
- **THEN** that module MUST appear as a namespace on the FireboltClient

#### Scenario: native module is excluded
- **WHEN** the AST contains a module with `platform: "native"`
- **THEN** that module's methods MUST NOT be generated
- **THEN** that module MUST NOT appear on the FireboltClient

---

### Requirement: Bundle version is derived from CanonicalAST.version
The `_VERSION` constant in the generated bundle SHALL equal the `version` string from the `CanonicalAST` (which originates from the OpenRPC `info.version` field of the processed documents).

#### Scenario: version matches OpenRPC version
- **WHEN** the OpenRPC documents carry `info.version: "9.0"`
- **THEN** the `_VERSION` constant MUST equal `"9.0"`

---

### Requirement: Single-primitive-wrap parameter pattern detection
The inject-js generator SHALL detect when a method signature matches the single-primitive-wrap pattern and generate an ergonomic stub that accepts a single primitive value and wraps it in an object.

#### Scenario: Method with single required primitive property
- **WHEN** a method has exactly 1 parameter
- **AND** that parameter is an object type
- **AND** that object has exactly 1 property
- **AND** that property is required
- **AND** that property is a primitive type (string, number, boolean, etc.)
- **THEN** the generator MUST use the single-primitive-wrap pattern
- **AND** the generated stub MUST accept a single primitive value
- **AND** the stub MUST wrap the value in an object with the property name

#### Scenario: Method with multiple parameters
- **WHEN** a method has more than 1 parameter
- **THEN** the generator MUST NOT use the single-primitive-wrap pattern
- **AND** the generator MUST use the standard object parameter pattern

#### Scenario: Method with optional single property
- **WHEN** a method has exactly 1 parameter
- **AND** that parameter is an object type
- **AND** that object has exactly 1 property
- **AND** that property is optional (not required)
- **THEN** the generator MUST NOT use the single-primitive-wrap pattern
- **AND** the generator MUST use the standard object parameter pattern

#### Scenario: Method with non-primitive property
- **WHEN** a method has exactly 1 parameter
- **AND** that parameter is an object type
- **AND** that object has exactly 1 property
- **AND** that property is required
- **AND** that property is a complex type (object, array, etc.)
- **THEN** the generator MUST NOT use the single-primitive-wrap pattern
- **AND** the generator MUST use the standard object parameter pattern

---

### Requirement: Single-primitive-wrap stub factory
The inject-js generator SHALL provide a stub factory function that generates methods using the single-primitive-wrap pattern.

#### Scenario: Generate primitive-wrap stub
- **WHEN** the generator processes a method matching the single-primitive-wrap pattern
- **THEN** the generator MUST call `_addMethodWithPrimitiveWrap(module, methodName, moduleName, paramName)`
- **AND** the generated stub MUST accept a single primitive value
- **AND** the stub MUST create an object with the property name and value
- **AND** the stub MUST pass the object to the JSON-RPC call

#### Scenario: Primitive-wrap method invocation
- **WHEN** a user calls a method using the single-primitive-wrap pattern
- **THEN** the user MUST pass a single primitive value
- **AND** the generated stub MUST wrap the value in an object
- **AND** the JSON-RPC request MUST contain the object with the property name
