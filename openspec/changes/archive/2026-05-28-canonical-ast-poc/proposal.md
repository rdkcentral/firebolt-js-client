## Why

Firebolt's original OpenRPC specs had JSON-RPC compliance gaps and no shared representation that could drive multi-language output — forcing each consuming team (TypeScript, C++, Kotlin, Python) to hand-author bindings that drifted from each other and from the spec. This PoC establishes the full four-layer pipeline (`OpenSpec → OpenRPC → Canonical AST → Language Headers`) for two worked methods, proving the design is sound before authoring the full Firebolt 9 surface.

## What Changes

- **New**: TypeScript type definitions for the Canonical AST (`src/ast/types.ts`)
- **New**: AST builder that parses OpenRPC JSON into a `CanonicalAST` object (`src/ast/builder.ts`)
- **New**: Five language generators — TypeScript, ReScript, Kotlin/JS, C++, Python — each a pure function over the AST
- **New**: CLI entry point (`src/cli.ts`) wiring the full pipeline end-to-end
- **New**: Derived OpenRPC contracts for four modules: `Discovery`, `Lifecycle2`, `Localization`, and `Accessibility`, plus the `shared` schema file
- **New**: OpenSpec module specs for `discovery`, `lifecycle2`, `shared`, `localization`, and `accessibility`
- **New**: Shared C++ header `FireboltResult.hpp` defining `FireboltResult<T>` and `FireboltError`
- **New**: Platform classification — every module spec and OpenRPC document declares `platform: web | native | both`; the AST builder validates the field is present and the generator registry filters module output by platform (web → ts/res/kt; native → cpp/py; both → all five)
- **New**: Value constraint meta-rules — string constraints (`minLength`, `maxLength`, `pattern`) and numeric constraints (`minimum`, `maximum`) are declared in the spec, mapped verbatim to JSON Schema keywords in OpenRPC, propagated to `PrimitiveRef.constraints` in the AST, and surfaced as documentation annotations or type-system annotations in all five generators
- **New**: Localization module — `onCountryChanged` subscribe event with ISO 3166-1 alpha-2 country code payload; demonstrates string constraint enforcement (`minLength: 2`, `maxLength: 2`, `pattern: "^[A-Z]{2}$"`)
- **New**: Accessibility module — `voiceGuidanceSettings` call returning a `VoiceGuidanceSettings` object; demonstrates numeric constraint enforcement (`rate: double`, `minimum: 0.1`, `maximum: 10`) on an object property
- **Scope**: Four modules with six methods/events collectively exercising every pipeline node type and both constraint kinds

## Capabilities

### New Capabilities

- `ast-builder`: Parse one or more OpenRPC JSON documents into a single `CanonicalAST`. Applies builder rules: strips `listen` param and `ListenResponse` from subscribe methods, derives `EnumValue.identifier` from `serializedId`, propagates `format: "date-time"` annotations, resolves `$ref` to `NamedRef` nodes, validates `x-firebolt-platform` and populates `Module.platform`, propagates value constraints (`minLength`/`maxLength`/`pattern` for strings; `minimum`/`maximum` for doubles and unsigned integers) to `PrimitiveRef.constraints`.
- `header-generation`: Accept a `CanonicalAST` and emit language-specific header files for five targets (TypeScript `.d.ts`, ReScript `.res`, Kotlin/JS `.kt`, C++ `.hpp`, Python `.pyi` + `.py`). Each generator is a pure function; no generator performs semantic inference. Generators are registered with a `targetPlatform` (web or native); `runAll` skips modules whose `platform` is incompatible. All generators emit constraint documentation on constrained method params/results and object properties; Python additionally emits `Annotated[str/float, "..."]` type annotations.
- `firebolt-cli`: Command-line interface (`generate`) that orchestrates the full pipeline: loads OpenRPC → validates → builds AST → runs generators → writes output files.

### Modified Capabilities

*(none — this is a greenfield pipeline)*

## Impact

- **New source tree**: `src/` — TypeScript project containing AST types, builder, generators, CLI
- **New output directory**: `out/` — generated headers, gitignored in normal use, committed for PoC review (21 files across 5 targets and 4 modules)
- **New OpenRPC contracts**: `src/openrpc/discovery.json`, `src/openrpc/lifecycle2.json`, `src/openrpc/localization.json`, `src/openrpc/accessibility.json`, `src/openrpc/shared.json`
- **New OpenSpec module specs**: `openspec/specs/discovery/spec.md`, `openspec/specs/lifecycle2/spec.md`, `openspec/specs/localization/spec.md`, `openspec/specs/accessibility/spec.md`
- **New meta-guides updated**: `openspec/specs/_meta/spec-format.md` (String Constraints + Numeric Constraints sections), `openspec/specs/_meta/openrpc-derivation.md` (Rule 3a + Rule 3b)
- **Dependencies**: `typescript`, `commander`, `@open-rpc/schema-utils-js` (build/dev only — no runtime deps)
- **Consumer trust**: Generated TypeScript headers must pass `tsc --noEmit`; C++ headers must compile with `-std=c++17`; Python stubs must pass `mypy --strict`
