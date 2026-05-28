## Context

Firebolt 9 needs a single build-time pipeline that transforms human-authored API
semantics into type-safe language headers for five targets. No such pipeline exists
today. The meta-guidelines in `openspec/specs/_meta/` define the rules; this PoC
implements them for four modules that collectively exercise every pipeline node type
plus two constraint kinds:

- `Discovery.watched` — `kind: "call"`, required + optional params, enum ref,
  `format: "date-time"`, void result
- `Lifecycle2.onStateChanged` — `kind: "subscribe"`, structured enum payload,
  no params after builder strips `listen`
- `Localization.onCountryChanged` — `kind: "subscribe"`, string payload with
  `minLength`/`maxLength`/`pattern` constraints; platform: both
- `Accessibility.voiceGuidanceSettings` — `kind: "call"`, returns named object type
  with a `double` property carrying `minimum`/`maximum` constraints; platform: both

The generator host is TypeScript (Node.js, build-time only). No runtime dependency
is introduced into the Firebolt JS client itself.

## Goals / Non-Goals

**Goals:**
- Implement the full four-layer pipeline for the four PoC modules
- Prove every AST node type (EnumType, ObjectType, PrimitiveRef with format/constraints,
  NamedRef, ArrayRef) is correctly translated to all five target languages
- Establish platform classification: `web | native | both` enforced at build time;
  generators only emit output for modules targeting their runtime
- Establish value constraints: string (`minLength`, `maxLength`, `pattern`) and numeric
  (`minimum`, `maximum`) declared once in the spec and surfaced in all generators
- Establish generator contracts that make adding a new module mechanical
- Validate generated headers with each language's own toolchain

**Non-Goals:**
- All other Firebolt 9 modules (deferred to full rollout)
- Runtime JSON-RPC transport layer
- Property kind (getter + setter + onChange triple) — no PoC examples needed
- CI/CD integration
- Cross-module `$ref` resolution (no current cases in Firebolt 9)

## Decisions

### Decision 1 — OpenRPC as the sole input to the AST builder

**Chosen**: The AST builder reads OpenRPC JSON directly; it never reads OpenSpec.

**Why**: OpenRPC is the validated, formal contract. OpenSpec is human prose plus
structured YAML — it is the *authoring* surface, not the processing surface.
Keeping the builder ignorant of OpenSpec means it can also consume OpenRPC docs
produced by other tools or hand-authored for edge cases.

**Alternative considered**: Builder reads OpenSpec YAML directly.
Rejected — this would couple the AST shape to the spec format, making both harder
to evolve independently.

---

### Decision 2 — `listen` param and `ListenResponse` stripped in the AST builder, not in generators

**Chosen**: Builder applies Rules 1 and 2 (strip `listen` param, strip
`ListenResponse` from subscribe result) before generators run.

**Why**: If generators strip these themselves, each of five generators must
implement the same detection logic. A bug in one generator produces an inconsistent
header. Centralising in the builder means the rule runs once and generators see a
clean AST.

**Alternative considered**: Generators handle `listen` / `ListenResponse` themselves.
Rejected — violates the principle that generators are mechanical translators, not
semantic processors.

---

### Decision 3 — `EnumValue.identifier` derived once in the AST builder

**Chosen**: The builder populates both `serializedId` (wire value) and `identifier`
(language-safe name) on every `EnumValue`. Generators use `identifier` exclusively
for code emission and `serializedId` exclusively for wire-value comments/decorators.

**Algorithm** (from `openrpc-derivation.md`):
1. Split `serializedId` on non-alphanumeric chars (`:`, `.`, `-`, `/`, space)
2. PascalCase each segment
3. Join segments
4. If result starts with a digit, prepend the parent enum name

| Wire value          | Derived identifier |
|---------------------|--------------------|
| `"app:adult"`       | `AppAdult`         |
| `"dolbyDigital5.1"` | `DolbyDigital51`   |
| `"initializing"`    | `Initializing`     |

**Why**: Same rationale as Decision 2 — one derivation, five consistent outputs.

---

### Decision 4 — `format: "date-time"` kept on `PrimitiveRef`, not promoted to a named type

**Chosen**: `PrimitiveRef { primitive: "string", format: "date-time" }` — the format
is an annotation on the primitive, not a separate `TypeDecl`.

**Why**: ISO 8601 date-time strings are not a distinct Firebolt type; they are
constrained strings. Different languages handle them differently at the type level:
TypeScript and C++ keep them as `string`/`std::string`; Python promotes to
`datetime.datetime`. The annotation carries the intent; generators decide the output.

**Alternative considered**: Create a `DateTimeAlias` TypeDecl.
Rejected — creates a new named type that is not in the OpenRPC schema and would
confuse `$ref` resolution.

---

### Decision 5 — `FireboltResult<T>` defined in a shared C++ header, not generated

**Chosen**: The C++ generator emits `#include "firebolt/result.hpp"` and references
`FireboltResult<T>`. The template definition lives in a hand-authored
`out/cpp/firebolt/result.hpp`, committed alongside generated files for the PoC.

**Structure**:
```cpp
struct FireboltError { int32_t code; std::string message; };

template<typename T>
struct FireboltResult {
    bool success;
    T value;              // valid when success == true
    FireboltError error;  // valid when success == false
};

template<>
struct FireboltResult<void> {
    bool success;
    FireboltError error;
};
```

**Why**: `FireboltResult<T>` is a template — it cannot be expressed as a schema
type or derived from the AST. It is a generator-level convention that wraps every
call result in the C++ target. Keeping it hand-authored makes it auditable and
stable across generator runs.

---

### Decision 6 — Python emits both `.pyi` stub and `.py` abstract base from the same AST pass

**Chosen**: The Python generator makes a single pass over the AST and emits two
files per module: `<module>.pyi` (type stub) and `<module>_protocol.py` (abstract
Protocol base).

**Why**: Both files serve different consumers — `.pyi` for IDE static analysis,
`.py` for runtime type checking of mock/test implementations. They share all type
declarations and differ only in method body style (ellipsis `...` vs `@abstractmethod`).
A single pass is simpler than two separate generators.

---

## Pipeline Trace — Full Example

Showing the complete chain for all four PoC modules (abbreviated to key nodes).

### Discovery.watched + Lifecycle2.onStateChanged (original PoC methods)

```
LAYER 1 — OPENSPEC
─────────────────────────────────────────────────────────

openspec/specs/discovery/spec.md     platform: both
  actions:
    watched:
      params: [entityId(string,req), progress(double,opt),
               completed(bool,opt), watchedOn(string+date-time,opt),
               agePolicy($ref:AgePolicy,opt)]
      result: none

openspec/specs/lifecycle2/spec.md    platform: native
  types:
    LifecycleState: enum [initializing,paused,active,suspended,hibernated,terminating]
    StateChangedEvent: object {oldState: $ref:LifecycleState, newState: $ref:LifecycleState}
  events:
    onStateChanged: payload → $ref:StateChangedEvent


LAYER 2 — DERIVED OPENRPC
─────────────────────────────────────────────────────────

src/openrpc/discovery.json
  info["x-firebolt-platform"]: "both"
  method: Discovery.watched
    params: [entityId(string,req), progress(number,opt), completed(bool,opt),
             watchedOn(string+date-time,opt), agePolicy($ref:AgePolicy,opt)]
    result: { type: "null" }

src/openrpc/lifecycle2.json
  info["x-firebolt-platform"]: "native"
  method: Lifecycle2.onStateChanged   ← subscribe tag
    params: [listen(boolean,req)]
    result: oneOf[ListenResponse, $ref:StateChangedEvent]


LAYER 3 — CANONICAL AST  (after builder rules applied)
─────────────────────────────────────────────────────────

Module { name:"Discovery", platform:"both", methods:[watched], types:[AgePolicy] }
Module { name:"Lifecycle2", platform:"native", methods:[onStateChanged], types:[...] }

Method { name:"watched", kind:"call", params:[...5 params...], result:null }
Method { name:"onStateChanged", kind:"subscribe", params:[], result:NamedRef("StateChangedEvent") }


LAYER 4 — GENERATED HEADERS (TypeScript example)
─────────────────────────────────────────────────────────

// out/ts/Discovery.d.ts            ← emitted (platform: both → web targets run)
type AgePolicy = "app:adult" | "app:child" | "app:teen";
declare namespace Discovery {
  function watched(entityId: string, progress?: number, ...): Promise<void>;
}

// out/ts/Lifecycle2.d.ts           ← NOT emitted (platform: native, ts is web target)
// out/cpp/firebolt/Lifecycle2.hpp  ← emitted (platform: native → native targets run)
```

---

### Localization.onCountryChanged (string constraints)

```
LAYER 1 — OPENSPEC
─────────────────────────────────────────────────────────

openspec/specs/localization/spec.md   platform: both
  events:
    onCountryChanged:
      payload:
        type: string
        minLength: 2
        maxLength: 2
        pattern: "^[A-Z]{2}$"
        description: ISO 3166-1 alpha-2 country code


LAYER 2 — DERIVED OPENRPC
─────────────────────────────────────────────────────────

src/openrpc/localization.json
  info["x-firebolt-platform"]: "both"
  method: Localization.onCountryChanged
    result: oneOf[
      ListenResponse,
      { "type":"string", "minLength":2, "maxLength":2, "pattern":"^[A-Z]{2}$" }
    ]


LAYER 3 — CANONICAL AST
─────────────────────────────────────────────────────────

Method {
  name: "onCountryChanged", kind: "subscribe",
  params: [],
  result: PrimitiveRef {
    kind: "primitive", primitive: "string",
    constraints: { minLength: 2, maxLength: 2, pattern: "^[A-Z]{2}$" }
  }
}


LAYER 4 — GENERATED HEADERS
─────────────────────────────────────────────────────────

// TypeScript (.d.ts)
/** Fires when the platform's active country setting changes.
 * Constraints — event payload: minLength=2, maxLength=2, pattern=^[A-Z]{2}$ */
function onCountryChanged(callback: (event: string) => void): () => void;

// Python (.pyi)
def onCountryChanged(self, callback: Callable[[Annotated[str, "minLength=2, maxLength=2, pattern=^[A-Z]{2}$"]], None]) -> Callable[[], None]: ...

// C++ (.hpp)
// Constraints — result: minLength=2, maxLength=2, pattern=^[A-Z]{2}$
UnsubscribeFn onCountryChanged(std::function<void(std::string)> callback);
```

---

### Accessibility.voiceGuidanceSettings (numeric constraints on object property)

```
LAYER 1 — OPENSPEC
─────────────────────────────────────────────────────────

openspec/specs/accessibility/spec.md   platform: both
  types:
    VoiceGuidanceSettings:
      properties:
        enabled:         type: bool
        rate:            type: double, minimum: 0.1, maximum: 10
        navigationHints: type: bool
  actions:
    voiceGuidanceSettings:
      result: $ref: VoiceGuidanceSettings


LAYER 2 — DERIVED OPENRPC
─────────────────────────────────────────────────────────

src/openrpc/accessibility.json
  info["x-firebolt-platform"]: "both"
  components/schemas/VoiceGuidanceSettings:
    type: object
    properties:
      rate: { type: "number", format: "double", minimum: 0.1, maximum: 10 }
      ...
  method: Accessibility.voiceGuidanceSettings
    result: { $ref: "#/components/schemas/VoiceGuidanceSettings" }


LAYER 3 — CANONICAL AST
─────────────────────────────────────────────────────────

ObjectTypeDecl {
  kind: "object", name: "VoiceGuidanceSettings",
  properties: [
    { name: "enabled",         type: PrimitiveRef("bool"),   required: true },
    { name: "rate",            type: PrimitiveRef("double",
                                 constraints: { minimum: 0.1, maximum: 10 }),
                                                              required: true },
    { name: "navigationHints", type: PrimitiveRef("bool"),   required: true }
  ]
}

Method { name: "voiceGuidanceSettings", kind: "call",
         params: [], result: NamedRef("VoiceGuidanceSettings") }


LAYER 4 — GENERATED HEADERS
─────────────────────────────────────────────────────────

// TypeScript (.d.ts)
interface VoiceGuidanceSettings {
  enabled: boolean;
  /** Constraints: minimum=0.1, maximum=10 */
  rate: number;
  navigationHints: boolean;
}

// Kotlin (.kt)
external interface VoiceGuidanceSettings {
    val enabled: Boolean
    val rate: Double // minimum=0.1, maximum=10
    val navigationHints: Boolean
}

// Python (.pyi)
class VoiceGuidanceSettings(TypedDict):
    enabled: bool
    rate: Annotated[float, "minimum=0.1, maximum=10"]
    navigationHints: bool
```

## Risks / Trade-offs

- **OpenRPC validation false negatives** → `@open-rpc/schema-utils-js` may not catch
  all semantic errors (e.g., `oneOf` missing `ListenResponse`). Mitigation: add
  PoC-specific structural assertions in the builder before Rules 1/2 run.

- **ReScript `@as` decorator compatibility** → ReScript compiler version sensitivity.
  Mitigation: pin `rescript` version in `package.json`; add compiler version to README.

- **Kotlin `definedExternally` for optional params** → Some Kotlin/JS toolchain
  versions require explicit `JsName` annotations on `external` declarations.
  Mitigation: validate with the specific `kotlinc-js` version used in the WPE build.

- **C++ `std::optional` C++17 requirement** → Devices building with C++14 will fail.
  Mitigation: document C++17 as the minimum in `result.hpp`; add `static_assert`.

- **`EnumValue.identifier` collisions** — two wire values that hash to the same
  identifier (e.g. `"foo-bar"` and `"foo.bar"` both → `FooBar`). Mitigation: AST
  builder detects duplicates within the same enum and throws a build error.

## Open Questions

- Should the C++ generator also emit a serialization helper
  (`agePolicyToString()` / `agePolicyFromString()`)? Deferred — the PoC headers
  prove the type shape; serialization is a runtime concern outside header scope.

- Should `out/` be committed to the repo for PoC review, or only generated on CI?
  Recommendation: commit for PoC review, add to `.gitignore` after full rollout.

---

### Decision 7 — Platform classification via `x-firebolt-platform` in OpenRPC `info`

**Chosen**: Every OpenRPC document has `info["x-firebolt-platform"]: "web" | "native" | "both"`. The AST builder validates its presence and populates `Module.platform`. The generator registry stores a `targetPlatform` per generator (`"web"` or `"native"`). `runAll()` skips any module where `module.platform !== "both" && module.platform !== entry.targetPlatform`.

**Why**: Platform differences are a first-class Firebolt concern — some APIs are only meaningful on web runtimes (browser-based, ReScript bindings) while others are only on native (C++, Python). Encoding this in the spec and enforcing it at build time prevents silent cross-platform header drift. Using the OpenRPC `info` extension keeps the check colocated with the contract source, not scattered across generator code.

**Validation rule**: Missing `x-firebolt-platform` or any value outside `{"web", "native", "both"}` throws a `BuildError` before any module is processed.

**Alternative considered**: Declare platform in the CLI invocation (e.g., `--platform native`).
Rejected — that makes platform an operator concern rather than a spec concern; two operators could generate incompatible headers from the same spec.

---

### Decision 8 — Value constraints carried as `PrimitiveRef.constraints`, not promoted to new TypeDecl kinds

**Chosen**: String constraints (`minLength`, `maxLength`, `pattern`) and numeric constraints (`minimum`, `maximum`) are stored in a single `Constraints` interface on the existing `PrimitiveRef`. The `constraints` field is optional and only present when at least one constraint was declared.

**Why**: Constraints are annotations on primitive values, not new types. Promoting them to `TypeDecl` nodes (e.g., `ConstrainedStringDecl`) would create synthetic types not present in the OpenRPC schema, polluting the `$ref` resolution space and making the AST harder to traverse. Keeping them as metadata on `PrimitiveRef` means:
- Existing generator traversal logic works unchanged
- Generators can opt in to constraint emission without affecting type output
- The same `Constraints` interface covers both string and numeric kinds via disjoint optional fields

**Generator behaviour**:
- TypeScript, ReScript, Kotlin, C++: emit constraint information as JSDoc / comments on method signatures and object property declarations
- Python: emit `Annotated[str, "..."]` / `Annotated[float, "..."]` for full type-level annotation; `from typing import Annotated` is added conditionally only when at least one constrained field exists in the module

**Constraint scope**: Both method-level (params + result) and object property-level constraints are surfaced. The `extractConstraints(ref: TypeRef)` utility in `generators/index.ts` unwraps `OptionalRef` and returns the `Constraints` from the innermost `PrimitiveRef`.

**Alternative considered**: Separate `StringConstraints` and `NumericConstraints` types on `PrimitiveRef`.
Rejected — two optional fields on `PrimitiveRef` complicate traversal; a single unified `Constraints` interface is simpler and the disjoint field names prevent confusion.
