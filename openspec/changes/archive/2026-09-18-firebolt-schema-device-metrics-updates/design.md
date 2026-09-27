## Context

The Firebolt JS Client follows a strict pipeline: OpenSpec specs → OpenRPC schemas → Canonical AST → Generated language headers. The current inject-js generator supports two parameter patterns: no-param (`method()`) and single-object-param (`method({ param: value })`). The Metrics module requires several parameter updates, and the new `appInfo` method signature needs a more ergonomic calling pattern where a single primitive value is automatically wrapped in an object.

Current state:
- Metrics methods use object parameters for structured data
- ErrorType enum has outdated values that don't match current error classification
- AgePolicy schema is duplicated between Discovery and needs to be shared
- inject-js generator lacks single-primitive-wrap pattern

Constraints:
- All changes must maintain JSON-RPC compatibility
- Breaking changes are acceptable (no current users)
- Generated headers must work across all language targets
- Platform targeting: all changes apply to both web and native

## Goals / Non-Goals

**Goals:**
- Update Metrics module OpenRPC schema with new parameter structures
- Replace ErrorType enum with current error classification values
- Move AgePolicy to shared schemas for cross-module reuse
- Add single-primitive-wrap parameter pattern to inject-js generator
- Regenerate all language headers from updated schemas

**Non-Goals:**
- Update TypeScript definitions to match new parameter patterns (deferred to follow-up)
- Add runtime parameter validation in generated stubs
- Support dynamic extension schema loading with new pattern
- Change JSON-RPC wire protocol

## Decisions

### Decision 1: Single-Primitive-Wrap Pattern Detection

**Choice:** Detect single-primitive-wrap pattern in AST when: method has exactly 1 param, that param is an object with exactly 1 required property, and that property is a primitive type.

**Rationale:**
- Clear, deterministic rules avoid ambiguity
- Required property ensures the pattern is safe (no partial objects)
- Primitive type check prevents complex nested objects from using this pattern
- Exactly 1 property prevents multi-property objects from being incorrectly wrapped

**Alternatives Considered:**
- Allow optional properties: Rejected - optional properties suggest the object pattern is more appropriate
- Allow any number of properties: Rejected - defeats the purpose of the ergonomic primitive pattern
- Use explicit schema annotation: Rejected - adds complexity to OpenRPC schema without clear benefit

### Decision 2: Inject-JS Stub Factory Implementation

**Choice:** Add `_addMethodWithPrimitiveWrap()` function that accepts the property name and generates a stub that wraps the primitive value.

**Rationale:**
- Follows existing pattern of separate stub factories (`_addMethodNoParams`, `_addMethodWithObjectParam`)
- Property name is known at generation time, so can be hardcoded in the stub
- Minimal bundle size impact - one additional small function
- Clear separation of concerns for each parameter pattern

**Implementation:**
```javascript
function _addMethodWithPrimitiveWrap(module, methodName, moduleName, paramName) {
  Object.defineProperty(module, methodName, {
    value: function(primitiveValue) {
      return _rpcCall(moduleName + "." + methodName, { [paramName]: primitiveValue });
    },
    writable: false,
    enumerable: true,
    configurable: false
  })
}
```

### Decision 3: AgePolicy Schema Location

**Choice:** Move AgePolicy schema from Discovery module to shared.json and update Discovery to reference it.

**Rationale:**
- AgePolicy is used across multiple modules (Discovery, Metrics)
- Shared schemas are the canonical location for cross-module types
- Fixes broken reference in current metrics.json to shared.json#/components/schemas/AgePolicy
- Aligns with "shared agePolicy where appropriate" requirement

**Alternatives Considered:**
- Keep AgePolicy in Discovery and reference from Metrics: Rejected - creates circular dependency
- Define AgePolicy locally in each module: Rejected - defeats purpose of shared schemas
- Create separate age-policy module: Rejected - overkill for a simple enum

### Decision 4: ErrorType Enum Replacement

**Choice:** Completely replace ErrorType enum values with new classification: `network`, `media`, `restriction`, `entitlement`, `other`.

**Rationale:**
- Current enum values don't match modern error classification needs
- No current users, so breaking change is acceptable
- New values align with current error taxonomy
- Simpler than maintaining backward compatibility with deprecated values

**Alternatives Considered:**
- Add new values alongside old ones: Rejected - creates confusion and maintenance burden
- Map old values to new values: Rejected - unnecessary complexity with no users

## Spec → OpenRPC → AST → Emitted Code Chain

### Example: Metrics.appInfo with Single-Primitive-Wrap Pattern

**Spec (openspec/specs/api/metrics/spec.md):**
```yaml
- name: appInfo
  description: Sends app-specific metrics to the platform.
  since: "9.0.0"
  params:
    - name: build
      type: string
      required: true
      description: Build identifier for the app
```

**OpenRPC (src/openrpc/metrics.json):**
```json
{
  "name": "Metrics.appInfo",
  "summary": "Send app-specific metrics.",
  "description": "Sends app-specific metrics to the platform.",
  "params": [
    {
      "name": "build",
      "required": true,
      "schema": { "type": "string" },
      "description": "Build identifier for the app"
    }
  ],
  "result": {
    "name": "result",
    "schema": { "type": "null" }
  }
}
```

**Canonical AST (in-memory):**
```typescript
{
  name: "appInfo",
  kind: "call",
  params: [
    { 
      name: "build", 
      type: { kind: "primitive", primitive: "string" }, 
      required: true 
    }
  ],
  result: null
}
```

**Pattern Detection Logic (inject-js.ts):**
```typescript
function getParamPattern(method: any): "no-params" | "single-param" | "primitive-wrap" {
  if (method.params.length === 0) {
    return "no-params";
  }
  if (method.params.length === 1) {
    const param = method.params[0];
    if (param.type.kind === "object" && 
        param.type.properties.length === 1 &&
        param.type.properties[0].required &&
        param.type.properties[0].type.kind === "primitive") {
      return "primitive-wrap";
    }
  }
  return "single-param";
}
```

**Emitted Code (generated/inject-js/firebolt-inject.js):**
```javascript
// Method registry
"Metrics.appInfo": {"kind":"call", "paramCount":1, "pattern":"primitive-wrap"}

// Generated stub
Metrics.appInfo = function(build) {
  return _rpcCall("Metrics.appInfo", { build: build });
};
```

**Usage:**
```javascript
// Before (object pattern):
await firebolt.Metrics.appInfo({ build: "1.2.3" });

// After (primitive-wrap pattern):
await firebolt.Metrics.appInfo("1.2.3");
```

### Example: Metrics.error with New Parameter Structure

**Spec (openspec/specs/api/metrics/spec.md):**
```yaml
- name: error
  description: Logs an error that occurred within the app.
  since: "9.0.0"
  params:
    - name: type
      type:
        $ref: "#/types/ErrorType"
      required: true
      description: Type of error
    - name: code
      type: string
      required: true
      description: Error code
    - name: description
      type: string
      required: true
      description: Human-readable error description
    - name: visible
      type: bool
      required: true
      description: Whether error should be visible to user
    - name: parameters
      type: object
      required: false
      description: Additional error parameters as key-value pairs
    - name: agePolicy
      type:
        $ref: "shared:AgePolicy"
      required: false
      description: Age policy for content context
```

**OpenRPC (src/openrpc/metrics.json):**
```json
{
  "name": "Metrics.error",
  "params": [
    {
      "name": "type",
      "required": true,
      "schema": { "$ref": "#/components/schemas/ErrorType" }
    },
    {
      "name": "code",
      "required": true,
      "schema": { "type": "string" }
    },
    {
      "name": "description",
      "required": true,
      "schema": { "type": "string" }
    },
    {
      "name": "visible",
      "required": true,
      "schema": { "type": "boolean" }
    },
    {
      "name": "parameters",
      "required": false,
      "schema": { "type": "object" }
    },
    {
      "name": "agePolicy",
      "required": false,
      "schema": { "$ref": "shared.json#/components/schemas/AgePolicy" }
    }
  ]
}
```

## Risks / Trade-offs

### Risk 1: Pattern Detection False Positives

**Risk:** The single-primitive-wrap pattern detection might incorrectly identify methods that should use the object pattern.

**Mitigation:** Strict detection criteria (exactly 1 param, object type, exactly 1 required property, primitive type) minimize false positives. Manual review of generated code during implementation.

### Risk 2: Generator Bundle Size Increase

**Risk:** Adding new stub factory function increases generated bundle size.

**Mitigation:** Impact is minimal - one additional small function (~5 lines). Ergonomic benefits outweigh negligible size increase.

### Risk 3: Breaking Changes Impact Future Users

**Risk:** Breaking changes to Metrics API might affect future adopters.

**Mitigation:** No current users, so breaking changes are acceptable. Clear documentation in change proposal and design. Future users will start with the updated API surface.

### Trade-off: Pattern Complexity vs. Ergonomics

**Trade-off:** Adding a third parameter pattern increases generator complexity but provides better ergonomics for specific use cases.

**Rationale:** The single-primitive-wrap pattern is narrowly scoped and well-defined. The complexity is localized to the inject-js generator and doesn't affect other generators or the AST.

## Migration Plan

Since there are no current users, no migration is required for existing code. The deployment path is:

1. **Schema Updates:** Update OpenRPC schemas (metrics.json, shared.json, discovery.json)
2. **Spec Updates:** Update OpenSpec specs to reflect new API contracts
3. **Generator Enhancement:** Implement single-primitive-wrap pattern in inject-js.ts
4. **Regeneration:** Run `npm run generate` to produce updated language headers
5. **Testing:** Verify generated code compiles and pattern detection works correctly
6. **Deployment:** Deploy updated schemas and generated headers

**Rollback Strategy:** If issues arise, revert schema changes and regenerate headers. The previous API surface can be restored by reverting the OpenRPC files.

## Open Questions

1. **TypeScript Definition Updates:** Should the TypeScript generator be updated to match the new parameter patterns in this change?
   - **Decision:** Defer to follow-up change to keep this change focused on schemas and inject-js generator.

2. **Pattern Extension:** Should the single-primitive-wrap pattern be extended to support other scenarios (e.g., optional single property)?
   - **Decision:** No - keep pattern strict and well-defined. Additional patterns can be added later if needed.

3. **Parameters Object Structure:** For Metrics.error, should the `parameters` field have a specific schema or remain free-form?
   - **Decision:** Free-form object as specified - allows flexibility for different error types.
