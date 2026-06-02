## Context

The firebolt-js-client pipeline derives everything from OpenSpec module specs:

```
openspec/specs/<module>/spec.md   (human-authored YAML frontmatter)
        ↓
src/openrpc/<module>.json         (AI-derived OpenRPC contract)
        ↓
CanonicalAST (in-memory)          (parsed by src/ast/builder.ts)
        ↓
out/inject-js/firebolt-inject.js  (emitted by src/generators/inject-js.ts)
```

Currently only 3 of the 36 JS-approved RDK9 methods are present. The inject-js
generator's `_methodRegistry` and `_typeSchemas` blocks are therefore almost
empty, and WPE apps calling any missing method receive no entry in the registry.

All infrastructure is already correct — the generator, AST builder, and OpenRPC
derivation rules are unchanged. This change is purely additive: feed more methods
through the existing pipeline.

## Goals / Non-Goals

**Goals:**
- Author OpenSpec YAML for all 36 JS-approved RDK9 methods across 9 modules
- Derive correct OpenRPC JSON for each module
- Verify the inject-js `_methodRegistry` entries are produced for all new methods

**Non-Goals:**
- Generator code changes (none required)
- AST node type additions (no new type patterns needed)
- Native-only methods (C++-only; skipped intentionally)
- Unapproved (red) spec entries

## Decisions

### D1 — Semantic kind mapping per spec entry

| Spec pattern | Semantic kind | OpenRPC methods produced |
|---|---|---|
| Getter + `on*Changed` event | `properties` | `Module.foo` (call) + `Module.onFooChanged` (subscribe) |
| Getter only (no event) | `actions` | `Module.foo` (call) |
| `on*` only (no getter) | `events` | `Module.onFoo` (subscribe) |
| Fire-and-forget (no return, no event) | `actions` | `Module.foo` (call) |

Rationale: spec-format `properties` is the right semantic for getter+event pairs
because the event payload is always identical to the getter result — the spec
format's invariant. `actions` handles both getter-only calls and fire-and-forget
calls uniformly. `events` handles spontaneous subscriptions without a getter.

### D2 — `Display` module platform is `web`, not `both`

The spec marks `Display.colorimetry` and `Display.videoResolutions` C++ `:cross:`
and JS `:tick:`. These methods are JS-only. Setting `platform: web` ensures the
inject-js generator includes them while C++/Python generators skip them.

All other new modules are `platform: both` (C++ and JS both `:tick:`).

### D3 — Metrics `AgePolicy` enum lives in `shared`, not `metrics`

All 13 Metrics methods that take `agePolicy` accept the same `"app:adult" |
"app:child" | "app:teen"` enum already defined in `openspec/specs/shared/spec.md`
(`Discovery.AgePolicy`). The Metrics spec will `$ref` `Shared.AgePolicy` rather
than redefine it.

### D4 — No new AST node types

Every type pattern introduced by this change is already handled by the AST builder:
- `bool`, `string`, `unsigned`, `double` → `PrimitiveRef`
- Named object types → `ObjectTypeDecl` + `NamedRef`
- Enums → `EnumTypeDecl`
- `list of X` → `ArrayRef`
- Optional params → `OptionalRef`

### D5 — Pipeline trace: `Device.hdr` / `Device.onHdrChanged`

```yaml
# openspec/specs/device/spec.md  (spec layer)
properties:
  hdr:
    description: Returns the HDR formats supported by the attached display.
    since: "8.0.0"
    result:
      $ref: "#/types/HdrCapabilities"
    examples:
      - description: HDR10 and Dolby Vision supported
        result:
          hdr10: true
          hdr10Plus: false
          dolbyVision: true
          hlg: false

types:
  HdrCapabilities:
    properties:
      hdr10:      { type: bool }
      hdr10Plus:  { type: bool }
      dolbyVision:{ type: bool }
      hlg:        { type: bool }
```

```json
// src/openrpc/device.json  (OpenRPC layer — two methods derived from one property)
{ "name": "Device.hdr",   "params": [], "result": { "$ref": "#/components/schemas/HdrCapabilities" } },
{ "name": "Device.onHdrChanged", "params": [{ "name": "listen", "schema": { "type": "boolean" } }], "result": { "$ref": "#/components/schemas/HdrCapabilities" } }
```

```
// CanonicalAST  (in-memory, AST layer)
Module "Device" → [
  Method { name: "hdr",          kind: "call",      result: NamedRef("Device.HdrCapabilities") },
  Method { name: "onHdrChanged", kind: "subscribe", result: NamedRef("Device.HdrCapabilities") }
]
TypeDecl ObjectTypeDecl { name: "HdrCapabilities", properties: [hdr10:bool, hdr10Plus:bool, dolbyVision:bool, hlg:bool] }
```

```js
// firebolt-inject.js  (generated output)
var _methodRegistry = {
  "Device.hdr":           { kind: "call",      resultSchema: { kind: "ref", name: "Device.HdrCapabilities" } },
  "Device.onHdrChanged":  { kind: "subscribe", resultSchema: { kind: "ref", name: "Device.HdrCapabilities" } },
  ...
};
var _typeSchemas = {
  "Device.HdrCapabilities": { kind: "object", properties: { hdr10: {kind:"primitive",type:"bool"}, ... }, required: [...] },
  ...
};
```

## Risks / Trade-offs

- [Risk] `Advertising.advertisingId` result shape (`ifa`, `ifa_type`, `lmt`) uses string enum values (`"dpid"`, `"sspid"`, `"sessionid"`, `"0"`, `"1"`) that are not validated by the spec today → Mitigation: declare inline enum types in the Advertising spec to make the contract explicit
- [Risk] `Actions.start` takes `intent` described as "a JSON document" (a string containing JSON) — the spec does not define a schema for the JSON payload → Mitigation: type as `string` in spec; add a descriptive comment; defer schema validation of the intent payload content to a future change
- [Risk] 17 Metrics methods is a large addition; a typo in one method name won't be caught until integration test → Mitigation: extend `inject-js.test.ts` to assert presence of all new method names in the registry

## Open Questions

None — all design decisions are resolved above.
