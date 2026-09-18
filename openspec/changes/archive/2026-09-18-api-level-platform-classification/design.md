## Context

The Firebolt JS Client follows a strict pipeline: OpenSpec (human-authored) → OpenRPC (AI-derived) → Canonical AST (parsed) → Generated headers (per-language). Currently, platform classification (`web` | `native` | `both`) exists only at the module level in the spec format, flows through to OpenRPC as `x-firebolt-platform` in the `info` object, and is stored on the AST `Module` node. Generators then filter entire modules based on this single platform value.

This module-level filtering is too coarse. Real-world Firebolt 9 APIs have mixed platform availability within modules:
- Device module needs some APIs C++-only (`uptime`, `timeInActiveState`, `chipsetId`) while others are cross-platform
- Display module (currently web-only) could benefit from adding C++-only APIs without changing the entire module to `platform: both`

The current workaround would be splitting modules or incorrectly exposing APIs, both of which are undesirable.

## Goals / Non-Goals

**Goals:**
- Enable platform classification at the individual API level (actions, properties, events)
- Maintain backward compatibility: modules without per-API platform declarations continue to work
- Ensure generators only emit APIs that match their target platform
- Provide clear inheritance rules: unspecified API platform inherits from module platform
- Validate platform combinations to prevent impossible configurations

**Non-Goals:**
- Type-level platform classification (types are data structures, not platform-specific)
- Changing the existing platform values or semantics
- Modifying the Firebolt 9 API model itself (this is purely a generator/infrastructure change)

## Decisions

### 1. Optional `platform` field on spec API elements

**Decision:** Add optional `platform` field to actions, properties, and events in the spec format. If not specified, the API inherits from the module's `platform` setting.

**Rationale:** Optional field maintains backward compatibility. Inheritance from module level provides sensible defaults and reduces spec verbosity when most APIs in a module share the same platform.

**Alternatives considered:**
- Required field on all APIs: Rejected - would require updating every existing spec, breaking backward compatibility
- Separate `webOnly` and `nativeOnly` boolean flags: Rejected - more complex, harder to reason about than a single enum

### 2. AST Method node gains optional `platform` field

**Decision:** Extend the `Method` interface in the AST to include `platform?: Platform`. This carries the per-API platform through the pipeline.

**Rationale:** The AST is the single source of truth for generators. Adding the field here allows generators to make filtering decisions without re-parsing OpenRPC or re-deriving from specs.

**Alternatives considered:**
- Store only in OpenRPC, let generators parse directly: Rejected - violates the AST-as-single-source-of-truth principle, adds complexity to each generator
- Use a separate mapping structure: Rejected - adds indirection, harder to maintain consistency

### 3. OpenRPC method-level `x-firebolt-platform` extension

**Decision:** When a spec declares `platform` on an API, derive it as an OpenRPC extension field on the method: `x-firebolt-platform: "web" | "native" | "both"`.

**Rationale:** OpenRPC is the formal contract layer. Method-level extensions are the standard way to carry Firebolt-specific metadata. This keeps the contract complete and self-describing.

**Alternatives considered:**
- Custom schema field instead of extension: Rejected - extensions are the OpenRPC standard for vendor-specific metadata
- Encode in method name or description: Rejected - fragile, requires parsing, not machine-readable

### 4. Generator filtering: method-level instead of module-level

**Decision:** Change generators from filtering entire modules to filtering individual methods within modules. A generator includes a method if the method's effective platform (method.platform or module.platform) matches the generator's target platform.

**Rationale:** This is the core behavioral change needed. Module-level filtering was the root cause of the coarse-grained problem. Method-level filtering enables mixed-platform modules.

**Filtering matrix:**
```
Method Platform    │  Web Generator │  Native Generator │  Both Generators
───────────────────┼────────────────┼──────────────────┼─────────────────
web                │  INCLUDE ✓     │  EXCLUDE ✗        │  INCLUDE ✓
native             │  EXCLUDE ✗     │  INCLUDE ✓        │  INCLUDE ✓
both (or unset)    │  INCLUDE ✓     │  INCLUDE ✓        │  INCLUDE ✓
```

**Alternatives considered:**
- Generate all methods, add runtime checks: Rejected - generated headers should be compile-time contracts, not runtime guards
- Split modules at generator level: Rejected - recreates the problem we're solving, just at a different layer

### 5. Validation of platform combinations

**Decision:** Add AST builder validation to prevent impossible platform combinations:
- `module.platform: web` cannot contain methods with `platform: native`
- `module.platform: native` cannot contain methods with `platform: web`
- `module.platform: both` can contain any mix of method platforms

**Rationale:** These combinations are logically impossible and indicate spec author errors. Catching them early prevents confusing generator behavior.

**Alternatives considered:**
- Allow any combination, let generators handle it: Rejected - would lead to empty generated files or confusing errors downstream
- No validation, rely on human review: Rejected - automation is more reliable and faster feedback

### 6. Type handling: include all module types regardless of method platform

**Decision:** Types defined in a module are included in all generated headers for that module, regardless of which methods use them.

**Rationale:** Types are data structures, not platform-specific logic. Having unused types in headers doesn't harm correctness and simplifies the generator logic. If a C++ developer sees a web-only type, they'll understand it's part of the module's type system.

**Alternatives considered:**
- Filter types by usage: Rejected - adds significant complexity (need to track type dependencies across methods), marginal benefit
- Split types by platform: Rejected - types can be shared across platforms, forcing a choice would be artificial

## Data Flow Example

**Spec:**
```yaml
---
module: Device
version: "9.0"
platform: both
actions:
  - name: uid
    description: Returns a persistent unique UUID
    # platform not specified → inherits "both"
    result:
      type: string

  - name: uptime
    description: Returns seconds since device boot
    platform: native  # ← override
    params: []
    result:
      type: number
```

**OpenRPC:**
```json
{
  "info": {
    "title": "Device",
    "version": "9.0",
    "x-firebolt-platform": "both"
  },
  "methods": [
    {
      "name": "Device.uid",
      "summary": "Returns a persistent unique UUID",
      "params": [],
      "result": { "schema": { "type": "string" } }
      // no x-firebolt-platform → inherits from module
    },
    {
      "name": "Device.uptime",
      "summary": "Returns seconds since device boot",
      "params": [],
      "result": { "schema": { "type": "number" } },
      "x-firebolt-platform": "native"  // ← method-level override
    }
  ]
}
```

**AST:**
```typescript
Module {
  name: "Device",
  platform: "both",
  methods: [
    Method {
      name: "uid",
      platform: undefined,  // inherits from module
      kind: "call",
      params: [],
      result: PrimitiveRef(string)
    },
    Method {
      name: "uptime",
      platform: "native",  // explicit override
      kind: "call",
      params: [],
      result: PrimitiveRef(number)
    }
  ]
}
```

**Generated TypeScript (web generator):**
```typescript
declare namespace Firebolt {
  namespace Device {
    function uid(): Promise<string>;  // ✓ included (effective platform: both)
    // uptime not generated (effective platform: native, generator target: web)
  }
}
```

**Generated C++ (native generator):**
```cpp
namespace Firebolt::Device {
  std::string uid();  // ✓ included (effective platform: both)
  double uptime();    // ✓ included (effective platform: native, generator target: native)
}
```

## Risks / Trade-offs

### Risk: Generator complexity increase
**Risk:** Method-level filtering adds complexity to all 5 generators compared to simple module-level filtering.

**Mitigation:** The filtering logic is centralized in `src/generators/index.ts` in the `runAll()` function. Individual generators receive pre-filtered modules, minimizing per-generator changes. The logic is straightforward (effective platform resolution + inclusion/exclusion matrix).

### Risk: Spec author confusion
**Risk:** Spec authors may forget to specify platform on methods, leading to unexpected inheritance from module level.

**Mitigation:** Clear documentation in spec-format.md with examples. The inheritance rule is intuitive (unspecified = inherit from module). Validation catches impossible combinations early.

### Risk: Breaking existing generated headers
**Risk:** When existing modules are updated with per-API platform classification, generated headers will change (some methods will disappear from certain platforms).

**Mitigation:** This is intentional and desired behavior. The change should be coordinated with consumers of the generated headers. Migration path: update specs → regenerate headers → verify consumers still compile.

### Trade-off: Type inclusion vs. header cleanliness
**Trade-off:** Including all module types regardless of method platform means headers may contain unused types.

**Rationale:** Simplicity and correctness outweigh header cleanliness. Types are just data structures; having them available doesn't cause harm. Filtering by usage would require complex dependency tracking.

## Open Questions

None - the design is straightforward with no outstanding technical unknowns.
