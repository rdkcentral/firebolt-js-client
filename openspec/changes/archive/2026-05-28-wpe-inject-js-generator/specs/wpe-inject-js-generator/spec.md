## ADDED Requirements

### Requirement: Bundle exposes a frozen FireboltServiceManager global
The inject-js generator SHALL emit a self-contained IIFE that:
1. Constructs the `FireboltServiceManager` object and calls `Object.freeze()` on it (prevents adding, modifying, or deleting properties of the object itself).
2. Attaches it to `global` using `Object.defineProperty(global, "FireboltServiceManager", { value: <frozen_fsm>, writable: false, configurable: false, enumerable: true })` so the global property itself cannot be reassigned or deleted from page JavaScript.

The object MUST have exactly three members: `version` (string), `configure` (function), and `get` (function).

> Note: `Object.freeze()` alone is sufficient for `FireboltClient` and its module namespace objects because they are returned values, not global properties. `Object.defineProperty` is required only for the `FireboltServiceManager` global attachment.

#### Scenario: FireboltServiceManager is frozen after injection
- **WHEN** the generated bundle is evaluated
- **THEN** `Object.isFrozen(FireboltServiceManager)` MUST return `true`
- **THEN** `FireboltServiceManager.version` MUST equal the semver string from `CanonicalAST.version`
- **THEN** `typeof FireboltServiceManager.configure` MUST equal `"function"`
- **THEN** `typeof FireboltServiceManager.get` MUST equal `"function"`

#### Scenario: FireboltServiceManager cannot be mutated
- **WHEN** code attempts `FireboltServiceManager.newProp = 1` or `delete FireboltServiceManager.version`
- **THEN** the property MUST not be changed (silently fails in non-strict; throws `TypeError` in strict)

#### Scenario: FireboltServiceManager global property cannot be replaced
- **WHEN** code attempts `window.FireboltServiceManager = null` or `delete window.FireboltServiceManager`
- **THEN** the global property MUST remain pointing to the original frozen object (writable: false, configurable: false via `Object.defineProperty`)

---

### Requirement: configure() stores clientId for later transport use
`FireboltServiceManager.configure(config)` SHALL accept an object containing a `clientId` string and store it privately in the IIFE closure. It MUST NOT attempt to access `window.__firebolt_transport__` because the transport is not yet injected when `configure()` is called.

#### Scenario: configure stores clientId
- **WHEN** `FireboltServiceManager.configure({ clientId: "abc123" })` is called
- **THEN** subsequent `get()` calls MUST use `"abc123"` as the first argument to all transport methods

#### Scenario: configure does not access the transport
- **WHEN** `FireboltServiceManager.configure({ clientId: "abc123" })` is called before `window.__firebolt_transport__` exists
- **THEN** no error MUST be thrown

---

### Requirement: get() initialises transport lazily and returns a Promise
`FireboltServiceManager.get()` SHALL:
1. Throw a synchronous `Error` if `configure()` has not been called.
2. On first call: read `window.__firebolt_transport__`, register `onMessage` and `onConnectionStatus` callbacks, then call `connect()`.
3. Return a `Promise` that resolves to the singleton `FireboltClient` object once the transport emits `"connected"`.
4. On subsequent calls while connection is in progress: return a new `Promise` that also resolves to the same singleton instance when `"connected"` fires.
5. Once connected: return `Promise.resolve(<singleton>)` immediately.

#### Scenario: get() before configure() throws
- **WHEN** `FireboltServiceManager.get()` is called before `configure()`
- **THEN** a synchronous `Error` MUST be thrown with a message indicating configure must be called first

#### Scenario: get() resolves after connection is established
- **WHEN** `configure({ clientId })` has been called and `get()` is invoked
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

### Requirement: Call method stubs send JSON-RPC and validate both directions
Each `kind: "call"` method stub SHALL:
1. Validate user-supplied params against the method's `paramsSchema` before sending; reject the Promise if validation fails.
2. Allocate a unique integer `id` and send `{ jsonrpc:"2.0", id, method:"Module.methodName", params }` via `transport.send()`.
3. On receiving `{ id, result }`: validate the result against `resultSchema`; reject if invalid, resolve if valid.
4. On receiving `{ id, error }`: reject the Promise with an `Error` constructed from `error.message` and `error.code`.

#### Scenario: Call method params validation rejects on bad input
- **WHEN** a call stub is invoked with params that fail the paramsSchema (e.g., a required string field is missing)
- **THEN** the returned Promise MUST reject with an Error before any transport send occurs

#### Scenario: Call method result validation rejects on bad response
- **WHEN** the backend responds with a result that fails the resultSchema
- **THEN** the returned Promise MUST reject with an Error describing the validation failure

#### Scenario: Call method resolves with validated result
- **WHEN** the backend responds with `{ id, result: <valid> }`
- **THEN** the returned Promise MUST resolve with the result value

#### Scenario: Call method rejects on JSON-RPC error response
- **WHEN** the backend responds with `{ id, error: { code: 404, message: "Not found" } }`
- **THEN** the returned Promise MUST reject with an Error whose message includes "Not found" and code 404

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
3. Validate the payload against `eventSchema`; if validation fails, log a warning and do NOT dispatch.
4. Dispatch the validated payload to all registered callbacks in `_eventListeners[method]`.

#### Scenario: Primitive event payload extracted from params.value
- **WHEN** a notification `{ method:"Localization.onCountryChanged", params:{ value:"US" } }` arrives
- **THEN** the callback MUST receive `"US"` (not `{ value: "US" }`)

#### Scenario: Object event payload passed as params directly
- **WHEN** a notification `{ method:"SomeModule.onSomeChanged", params:{ key:"val" } }` arrives and `eventIsPrimitive` is `false`
- **THEN** the callback MUST receive `{ key:"val" }`

#### Scenario: Array event payload passed as params directly
- **WHEN** a notification `{ method:"SomeModule.onListChanged", params:["a","b"] }` arrives and `eventIsPrimitive` is `false`
- **THEN** the callback MUST receive `["a","b"]` (not `{ value: ["a","b"] }`)
- **NOTE** `ArrayRef` results have `eventIsPrimitive: false`; the generator MUST NOT set it to `true` for array types

#### Scenario: Invalid event payload is not dispatched
- **WHEN** a notification arrives with a payload that fails eventSchema validation
- **THEN** the callback MUST NOT be invoked
- **THEN** a warning MUST be logged to the console

---

### Requirement: Schema validation is fully recursive
The runtime validator SHALL recursively validate values against schema nodes of all kinds: `primitive` (with constraints), `object` (with required fields), `array` (each item), `optional`, `union` (any variant matches), `enum` (value is one of the declared wire strings), and `ref` (resolved from `_typeSchemas`). A `null` or absent schema means no validation is applied.

#### Scenario: Object schema validates required properties
- **WHEN** an object schema declares `required: ["enabled"]` and the value is `{}`
- **THEN** validation MUST return an error indicating "enabled" is missing

#### Scenario: Array schema validates each item
- **WHEN** an array schema has `items: { kind:"primitive", type:"string" }` and the value is `[1, 2]`
- **THEN** validation MUST return an error for each non-string item

#### Scenario: Union schema passes if any variant matches
- **WHEN** a union schema has variants `[string-schema, object-schema]` and the value is a string
- **THEN** validation MUST pass

#### Scenario: Primitive string constraint is enforced
- **WHEN** a primitive string schema has `constraints: { minLength:2, maxLength:2, pattern:"^[A-Z]{2}$" }` and the value is `"usa"`
- **THEN** validation MUST fail (length > 2 and pattern mismatch)

---

### Requirement: clientId and transport are never accessible from page code
The `clientId` and the reference to `window.__firebolt_transport__` SHALL be stored exclusively within the IIFE closure. No property on `FireboltServiceManager`, `FireboltClient`, or any module namespace SHALL expose these values.

#### Scenario: clientId is not accessible from page code
- **WHEN** page code inspects `FireboltServiceManager`, `firebolt`, or any module namespace
- **THEN** the `clientId` string MUST NOT be readable via any property path

#### Scenario: Transport reference is not accessible from page code
- **WHEN** page code inspects `FireboltServiceManager`, `firebolt`, or any module namespace
- **THEN** the `__firebolt_transport__` reference held in the closure MUST NOT be accessible via any property path

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
