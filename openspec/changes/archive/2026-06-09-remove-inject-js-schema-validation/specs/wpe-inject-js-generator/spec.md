## MODIFIED Requirements

### Requirement: Call method stubs send JSON-RPC and handle errors
Each `kind: "call"` method stub SHALL:
1. Allocate a unique integer `id` and send `{ jsonrpc:"2.0", id, method:"Module.methodName", params }` via `transport.send()`.
2. On receiving `{ id, result }`: resolve the Promise with the result value (no validation).
3. On receiving `{ id, error }`: reject the Promise with an `Error` constructed from `error.message` and `error.code`.

#### Scenario: Call method sends params without validation
- **WHEN** a call stub is invoked with any params (valid or invalid according to schema)
- **THEN** the transport SHALL send `{ jsonrpc:"2.0", id, method, params }` immediately without pre-validation

#### Scenario: Call method resolves with result
- **WHEN** the backend responds with `{ id, result: <value> }`
- **THEN** the returned Promise MUST resolve with the result value as-is (no validation)

#### Scenario: Call method rejects on backend error
- **WHEN** the backend responds with `{ id, error: { code: -32602, message: "Invalid params" } }`
- **THEN** the returned Promise MUST reject with an Error whose message includes the backend error message and code

---

### Requirement: Subscribe stubs register callbacks and await backend confirmation
Each `kind: "subscribe"` method stub SHALL:
1. Register the user callback in the internal `_eventListeners` map eagerly (before sending).
2. Send `{ jsonrpc:"2.0", id, method:"Module.onEventName", params:{ listen:true } }`.
3. Return a `Promise` that resolves with a synchronous unsubscribe function only when the backend confirms with `{ id, result: null }`.
4. On backend error response: remove the eagerly-registered callback, reject the Promise.
5. On transport send failure: remove the callback, reject the Promise.

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

## REMOVED Requirements

### Requirement: Call method stubs validate both directions
**Reason:** Schema validation should be owned by the backend for request params and by app code for response handling. Runtime validation in inject-js adds latency and complexity without providing value over backend-layer validation.

**Migration:** 
- Apps must handle backend JSON-RPC errors in Promise rejections (error.code, error.message)
- Backend validation errors are surfaced to apps as Promise rejections
- TypeScript types guide app developers at compile time; runtime type checking is not provided by inject-js

**Removed specifics:**
- Pre-send validation of params against paramsSchema
- Post-receive validation of results against resultSchema
- Generation and embedding of paramsSchema and resultSchema in method registry

---

### Requirement: Schema validation is fully recursive
**Reason:** With schema validation removed (see above), the recursive validator is no longer needed.

**Migration:** 
- Remove `_validate()` function and all helpers (`_validatePrimitive`, `_validateObject`, `_validateArray`, `_validateUnion`, `_validateEnum`)
- Remove `_typeSchemas` registry from bundle
- Stop emitting schema nodes during code generation

---

### Requirement: Event notifications validate payloads before dispatch
**Reason:** Events come from the platform (WPE), which is certified separately. Invalid event payloads should not be silently filtered by the client; instead, platform bugs should be visible and surfaced through failing listener code.

**Migration:** 
- Events are dispatched to listeners without pre-validation
- If a listener receives malformed data and throws, that error propagates to the app
- Platform testing and the separate Certification App (future proposal) ensure platform events are well-formed

**Removed specifics:**
- Validation of event payloads against eventSchema before dispatch
- Suppression and console.warn() logging of invalid events
- Generation and embedding of eventSchema in method registry
