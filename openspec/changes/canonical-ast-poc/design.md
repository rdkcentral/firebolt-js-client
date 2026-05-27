## Context

Firebolt 9 needs a single build-time pipeline that transforms human-authored API
semantics into type-safe language headers for five targets. No such pipeline exists
today. The meta-guidelines in `openspec/specs/_meta/` define the rules; this PoC
implements them for two methods that collectively exercise every pipeline node type:

- `Discovery.watched` — `kind: "call"`, required + optional params, enum ref,
  `format: "date-time"`, void result
- `Lifecycle2.onStateChanged` — `kind: "subscribe"`, structured enum payload,
  no params after builder strips `listen`

The generator host is TypeScript (Node.js, build-time only). No runtime dependency
is introduced into the Firebolt JS client itself.

## Goals / Non-Goals

**Goals:**
- Implement the full four-layer pipeline for the two PoC methods
- Prove every AST node type (EnumType, ObjectType, PrimitiveRef with format,
  NamedRef, ArrayRef) is correctly translated to all five target languages
- Establish generator contracts that make adding a new module mechanical
- Validate generated headers with each language's own toolchain

**Non-Goals:**
- All other Firebolt 9 modules (deferred to full rollout)
- Runtime JSON-RPC transport layer
- Property kind (getter + setter + onChange triple) — no PoC examples needed
- CI/CD integration
- Cross-module `$ref` (no current cases in Firebolt 9)

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

Showing the complete chain for both PoC methods:

```
LAYER 1 — OPENSPEC
─────────────────────────────────────────────────────────

openspec/specs/discovery/spec.md
  actions:
    watched:
      params: [entityId(string,req), progress(double,opt),
               completed(bool,opt), watchedOn(string+date-time,opt),
               agePolicy($ref:AgePolicy,opt)]
      result: none

openspec/specs/lifecycle2/spec.md
  types:
    LifecycleState: enum [initializing,paused,active,suspended,hibernated,terminating]
    StateChangedEvent: object {oldState: $ref:LifecycleState, newState: $ref:LifecycleState}
  events:
    onStateChanged: payload → $ref:StateChangedEvent


LAYER 2 — DERIVED OPENRPC
─────────────────────────────────────────────────────────

src/openrpc/discovery.json
  method: Discovery.watched
    params: [entityId(string,req), progress(number,opt), completed(bool,opt),
             watchedOn(string+date-time,opt), agePolicy($ref:AgePolicy,opt)]
    result: { type: "null" }

src/openrpc/lifecycle2.json
  method: Lifecycle2.onStateChanged   ← subscribe tag
    params: [listen(boolean,req)]     ← INJECTED by derivation rules
    result: oneOf[ListenResponse, $ref:StateChangedEvent]


LAYER 3 — CANONICAL AST  (after builder rules applied)
─────────────────────────────────────────────────────────

Method {
  name: "watched", kind: "call",
  params: [
    {name:"entityId",  type:PrimitiveRef(string),              required:true },
    {name:"progress",  type:PrimitiveRef(number),              required:false},
    {name:"completed", type:PrimitiveRef(boolean),             required:false},
    {name:"watchedOn", type:PrimitiveRef(string,"date-time"),  required:false},
    {name:"agePolicy", type:NamedRef("AgePolicy"),             required:false}
  ],
  result: PrimitiveRef(null)
}

Method {
  name: "onStateChanged", kind: "subscribe",
  params: [],                           ← listen STRIPPED (Rule 2)
  result: NamedRef("StateChangedEvent") ← ListenResponse STRIPPED (Rule 1)
}

EnumType { name:"AgePolicy", values:[
  {serializedId:"app:adult",  identifier:"AppAdult"},
  {serializedId:"app:child",  identifier:"AppChild"},
  {serializedId:"app:teen",   identifier:"AppTeen" }
]}

EnumType { name:"LifecycleState", values:[
  {serializedId:"initializing", identifier:"Initializing"},
  ...
]}

ObjectType { name:"StateChangedEvent", fields:[
  {name:"oldState", type:NamedRef("LifecycleState"), required:true},
  {name:"newState", type:NamedRef("LifecycleState"), required:true}
]}


LAYER 4 — GENERATED HEADERS (TypeScript example)
─────────────────────────────────────────────────────────

// out/ts/Discovery.d.ts
type AgePolicy = "app:adult" | "app:child" | "app:teen";
declare namespace Discovery {
  function watched(entityId: string, progress?: number,
    completed?: boolean, watchedOn?: string,
    agePolicy?: AgePolicy): Promise<void>;
}

// out/ts/Lifecycle2.d.ts
type LifecycleState = "initializing"|"paused"|"active"|"suspended"|"hibernated"|"terminating";
interface StateChangedEvent { oldState: LifecycleState; newState: LifecycleState; }
declare namespace Lifecycle2 {
  function onStateChanged(callback: (event: StateChangedEvent) => void): () => void;
}
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
