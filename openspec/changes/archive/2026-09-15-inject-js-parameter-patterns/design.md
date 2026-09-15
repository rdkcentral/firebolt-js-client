## Context

The inject-js generator currently produces a single parameter pattern for all Firebolt methods, where every method accepts a single `params` object. This means no-param methods must be called with empty objects (e.g., `Accessibility.audioDescription({})`), which is non-idiomatic JavaScript and reduces developer ergonomics.

The webkit extension in the `feat/fireboltweb` branch has evolved to support multiple parameter patterns, including no-param methods and named arguments. However, the inject-js generator on the develop branch only supports the single object parameter pattern.

**Current State:**
- All methods use `_makeCallStub(fullMethodName)` which accepts a single `params` object
- Method registry only contains `kind` and `eventIsPrimitive` metadata
- No distinction between methods with different parameter signatures

**Constraints:**
- Must maintain JSON-RPC compatibility (all calls ultimately send `{ jsonrpc: "2.0", id, method, params }`)
- Must maintain backward compatibility with existing code
- Must not introduce breaking changes to the generated API surface
- TypeScript definitions should eventually match the new patterns (future work)

## Goals / Non-Goals

**Goals:**
- Improve ergonomics for no-param methods by allowing them to be called without arguments
- Maintain JSON-RPC consistency for methods with parameters
- Support both primitive and object parameter values for single-param methods
- Add comprehensive test coverage for the new parameter patterns
- Document the parameter patterns for future reference

**Non-Goals:**
- Implement named arguments pattern (positional parameters) - excluded due to complexity and JSON-RPC mismatch
- Update TypeScript definitions in this change (future work)
- Support dynamic extension schema loading (future consideration)
- Change the JSON-RPC wire protocol

## Decisions

### Decision 1: Two Parameter Patterns Instead of One

**Choice:** Support two distinct parameter patterns (no-param and single-param) instead of the current single pattern.

**Rationale:**
- **Ergonomics:** No-param methods can be called as `method()` instead of `method({})`
- **Consistency:** Single-param pattern maintains JSON-RPC alignment for methods with parameters
- **Simplicity:** Avoids the complexity of named arguments pattern from webkit extension
- **Backward Compatibility:** Existing code using empty objects continues to work

**Alternatives Considered:**
- **Single pattern for all methods:** Current approach - rejected due to poor ergonomics for no-param methods
- **Named arguments pattern:** From webkit extension - rejected due to parameter order sensitivity and JSON-RPC mismatch
- **Three patterns (no-param, single-primitive, single-object):** Rejected as unnecessary complexity - single-param pattern handles both primitive and object values

### Decision 2: Parameter Count Metadata in Method Registry

**Choice:** Add `paramCount` field to method registry entries to enable pattern selection.

**Rationale:**
- Simple and efficient - just add a number to existing registry entries
- Enables pattern selection without complex type analysis
- Minimal impact on generated bundle size
- Easy to understand and maintain

**Example:**
```javascript
"Accessibility.audioDescription": {"kind":"call", "paramCount":0}
"Discovery.watched": {"kind":"call", "paramCount":5}
"Actions.start": {"kind":"call", "paramCount":2}
```

### Decision 3: Separate Stub Factory Functions

**Choice:** Create `_makeCallStubNoParams()` for no-param methods and keep `_makeCallStub()` for single-param methods.

**Rationale:**
- Clear separation of concerns
- Easy to understand and maintain
- Each factory has a single responsibility
- Follows existing pattern in the codebase

**Implementation:**
```javascript
function _makeCallStubNoParams(fullMethodName) {
  return function () {
    return _rpcCall(fullMethodName, {});
  };
}

function _makeCallStub(fullMethodName) {
  return function (param) {
    return _rpcCall(fullMethodName, param || {});
  };
}
```

### Decision 4: Pattern Selection in Instance Builder

**Choice:** Modify `_buildFireboltInstance()` to select stub factory based on `paramCount`.

**Rationale:**
- Centralized pattern selection logic
- Easy to extend if new patterns are needed in the future
- Maintains existing structure of the instance builder

**Implementation:**
```javascript
if (desc.kind === "subscribe") {
  modules[modName][methodName] = _makeSubscribeStub(fullName);
} else if (desc.paramCount === 0) {
  modules[modName][methodName] = _makeCallStubNoParams(fullName);
} else {
  modules[modName][methodName] = _makeCallStub(fullName);
}
```

## Spec → OpenRPC → AST → Emitted Code Chain

### Example: No-Param Method

**Spec (openspec/specs/accessibility/spec.md):**
```markdown
### Property: audioDescription
**Kind:** property
**Result:** boolean
```

**OpenRPC (src/openrpc/accessibility.json):**
```json
{
  "methods": [
    {
      "name": "audioDescription",
      "params": [],
      "result": { "$ref": "#/components/schemas/BooleanResult" }
    }
  ]
}
```

**Canonical AST (in-memory):**
```typescript
{
  name: "audioDescription",
  kind: "call",
  params: [],
  result: { kind: "primitive", primitive: "boolean" }
}
```

**Emitted Code (generated/inject-js/firebolt-inject.js):**
```javascript
// Method registry
"Accessibility.audioDescription": {"kind":"call", "paramCount":0}

// Generated stub
Accessibility.audioDescription = function() {
  return _rpcCall("Accessibility.audioDescription", {});
};
```

**Usage:**
```javascript
const isEnabled = await Accessibility.audioDescription();
```

### Example: Single-Param Method

**Spec (openspec/specs/discovery/spec.md):**
```markdown
### Action: watched
**Kind:** action
**Params:**
- `entityId` (string, required)
- `progress` (number, optional)
- `completed` (boolean, optional)
- `watchedOn` (string, optional)
- `agePolicy` (AgePolicy, optional)
**Result:** null
```

**OpenRPC (src/openrpc/discovery.json):**
```json
{
  "methods": [
    {
      "name": "watched",
      "params": [
        { "name": "entityId", "schema": { "type": "string" } },
        { "name": "progress", "schema": { "type": "number" } },
        // ... other params
      ],
      "result": { "type": "null" }
    }
  ]
}
```

**Canonical AST (in-memory):**
```typescript
{
  name: "watched",
  kind: "call",
  params: [
    { name: "entityId", type: { kind: "primitive", primitive: "string" }, required: true },
    { name: "progress", type: { kind: "primitive", primitive: "double" }, required: false },
    // ... other params
  ],
  result: null
}
```

**Emitted Code (generated/inject-js/firebolt-inject.js):**
```javascript
// Method registry
"Discovery.watched": {"kind":"call", "paramCount":5}

// Generated stub
Discovery.watched = function(param) {
  return _rpcCall("Discovery.watched", param || {});
};
```

**Usage:**
```javascript
await Discovery.watched({ 
  entityId: "entity123", 
  progress: 0.5,
  completed: false,
  watchedOn: "2026-09-15",
  agePolicy: "app:adult"
});
```

## Risks / Trade-offs

### Risk 1: Breaking Existing Code
**Risk:** Existing code that relies on the single parameter pattern might break.

**Mitigation:** The change is backward compatible. No-param methods can still be called with empty objects, and single-param methods work exactly as before. The change is additive, not breaking.

### Risk 2: TypeScript Definition Mismatch
**Risk:** TypeScript definitions might not match the new parameter patterns.

**Mitigation:** TypeScript definitions are generated separately and will need to be updated in a follow-up change. The current change focuses on the inject-js generator only.

### Risk 3: Increased Bundle Size
**Risk:** Adding a new stub factory function might increase the generated bundle size.

**Mitigation:** The impact is minimal - one additional small function. The ergonomic benefits outweigh the negligible size increase.

### Trade-off: Simplicity vs. Flexibility
**Trade-off:** We chose a simpler two-pattern approach over the more flexible named arguments pattern.

**Rationale:** The named arguments pattern adds complexity (parameter ordering, breaking changes when adding parameters) without significant ergonomic benefits for the JSON-RPC use case.

## Migration Plan

Since this is a generator implementation change with backward compatibility, no migration is required for existing code. The migration path is:

1. **Generator Update:** Deploy the updated inject-js generator
2. **Regenerate Bundle:** Run the generator to produce the new `firebolt-inject.js`
3. **Deploy Bundle:** Replace the existing bundle in the WPE extension
4. **Optional Code Updates:** Developers can optionally update their code to use the cleaner no-param syntax

**Rollback Strategy:** If issues arise, revert to the previous generator version and regenerate the bundle. The old pattern is still supported.

## Open Questions

1. **TypeScript Definitions:** Should we update the TypeScript generator to match the new parameter patterns in this change or defer to a follow-up?
   - **Decision:** Defer to follow-up change to keep this change focused.

2. **Extension Schema Support:** Should the inject-js generator support dynamic extension schema loading like the webkit extension?
   - **Decision:** Future consideration - not in scope for this change.

3. **Parameter Validation:** Should we add runtime parameter validation in the generated stubs?
   - **Decision:** No - maintain the current approach of sending parameters without validation, as per JSON-RPC philosophy.
