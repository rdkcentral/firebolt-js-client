## MODIFIED Requirements

### Requirement: Call method stubs send JSON-RPC without clientId
Each `kind: "call"` method stub SHALL:
1. Allocate a unique integer `id` and send `{ jsonrpc:"2.0", id, method:"Module.methodName", params }` via `transport.send(msg)` (no clientId argument).
2. On receiving `{ id, result }`: resolve the Promise with the result value (no validation).
3. On receiving `{ id, error }`: reject the Promise with an `Error` constructed from `error.message` and `error.code`.
4. The inject-js generator SHALL produce two distinct parameter patterns based on the method's parameter count:
   - **No-param methods** (paramCount === 0): Generate stubs that accept no arguments and send empty params object
   - **Single-param methods** (paramCount >= 1): Generate stubs that accept a single parameter (primitive or object) and send it as params

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

#### Scenario: No-param method stub is backward compatible with empty object
- **WHEN** a method with paramCount === 0 is invoked with an empty object
- **THEN** the method MUST still function correctly
- **THEN** the generated stub MUST send `{ jsonrpc:"2.0", id, method, params: {} }` to the transport

#### Scenario: Single-param method stub accepts primitive value
- **WHEN** a method with paramCount >= 1 is invoked with a primitive value (string, number, boolean)
- **THEN** the method MUST be callable as `Module.method(value)`
- **THEN** the generated stub MUST send the primitive value as the params field to the transport

#### Scenario: Single-param method stub accepts object value
- **WHEN** a method with paramCount >= 1 is invoked with an object
- **THEN** the method MUST be callable as `Module.method({ param1: value1, param2: value2 })`
- **THEN** the generated stub MUST send the object as the params field to the transport

#### Scenario: Method registry includes paramCount metadata
- **WHEN** the inject-js generator processes methods from the Canonical AST
- **THEN** each method entry in `_methodRegistry` MUST include a `paramCount` field
- **THEN** `paramCount` MUST equal the number of parameters in the AST method definition
- **THEN** the registry entry format MUST be `{"kind":"call", "paramCount": <number>}` for call methods

#### Scenario: Instance builder selects appropriate stub factory
- **WHEN** `_buildFireboltInstance()` processes a method from `_methodRegistry`
- **THEN** if `paramCount === 0`, it MUST use `_makeCallStubNoParams(fullMethodName)`
- **THEN** if `paramCount >= 1`, it MUST use `_makeCallStub(fullMethodName)`
- **THEN** if `kind === "subscribe"`, it MUST use `_makeSubscribeStub(fullMethodName)`

---

### Requirement: Method registry includes parameter count metadata
The inject-js generator SHALL include a `paramCount` field in each method registry entry to enable parameter pattern selection. The `paramCount` SHALL be derived from the Canonical AST method's parameter array length.

#### Scenario: Method registry entry includes paramCount
- **WHEN** the generator processes a method with N parameters
- **THEN** the registry entry MUST include `"paramCount": N`
- **THEN** the entry format MUST be `{"kind":"call", "paramCount": N}` for call methods

#### Scenario: No-param method has paramCount zero
- **WHEN** the generator processes a method with zero parameters
- **THEN** the registry entry MUST include `"paramCount": 0`

#### Scenario: Multi-param method has correct paramCount
- **WHEN** the generator processes a method with 5 parameters
- **THEN** the registry entry MUST include `"paramCount": 5`

---

### Requirement: Stub factory functions support dual parameter patterns
The inject-js generator SHALL include two stub factory functions for call methods:
1. `_makeCallStubNoParams(fullMethodName)` - generates stubs that accept no arguments
2. `_makeCallStub(fullMethodName)` - generates stubs that accept a single parameter

#### Scenario: No-param stub factory generates zero-argument function
- **WHEN** `_makeCallStubNoParams("Module.method")` is called
- **THEN** it MUST return `function() { return _rpcCall("Module.method", {}); }`

#### Scenario: Single-param stub factory generates single-argument function
- **WHEN** `_makeCallStub("Module.method")` is called
- **THEN** it MUST return `function(param) { return _rpcCall("Module.method", param || {}); }`
