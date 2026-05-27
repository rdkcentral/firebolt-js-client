## Why

Firebolt's original OpenRPC specs had JSON-RPC compliance gaps and no shared representation that could drive multi-language output — forcing each consuming team (TypeScript, C++, Kotlin, Python) to hand-author bindings that drifted from each other and from the spec. This PoC establishes the full four-layer pipeline (`OpenSpec → OpenRPC → Canonical AST → Language Headers`) for two worked methods, proving the design is sound before authoring the full Firebolt 9 surface.

## What Changes

- **New**: TypeScript type definitions for the Canonical AST (`src/ast/types.ts`)
- **New**: AST builder that parses OpenRPC JSON into a `CanonicalAST` object (`src/ast/builder.ts`)
- **New**: Five language generators — TypeScript, ReScript, Kotlin/JS, C++, Python — each a pure function over the AST
- **New**: CLI entry point (`src/cli.ts`) wiring the full pipeline end-to-end
- **New**: Derived OpenRPC contracts for two modules: `Discovery` and `Lifecycle2`, plus the `shared` schema file
- **New**: OpenSpec module specs for `discovery`, `lifecycle2`, and `shared`
- **New**: Shared C++ header `FireboltResult.hpp` defining `FireboltResult<T>` and `FireboltError`
- **Scope**: Two methods only — `Discovery.watched` (action with params) and `Lifecycle2.onStateChanged` (subscribe with enum payload)

## Capabilities

### New Capabilities

- `ast-builder`: Parse one or more OpenRPC JSON documents into a single `CanonicalAST`. Applies builder rules: strips `listen` param and `ListenResponse` from subscribe methods, derives `EnumValue.identifier` from `serializedId`, propagates `format: "date-time"` annotations, resolves `$ref` to `NamedRef` nodes.
- `header-generation`: Accept a `CanonicalAST` and emit language-specific header files for five targets (TypeScript `.d.ts`, ReScript `.res`, Kotlin/JS `.kt`, C++ `.hpp`, Python `.pyi` + `.py`). Each generator is a pure function; no generator performs semantic inference.
- `firebolt-cli`: Command-line interface (`generate`) that orchestrates the full pipeline: loads OpenRPC → validates → builds AST → runs generators → writes output files.

### Modified Capabilities

*(none — this is a greenfield pipeline)*

## Impact

- **New source tree**: `src/` — TypeScript project containing AST types, builder, generators, CLI
- **New output directory**: `out/` — generated headers, gitignored in normal use, committed for PoC review
- **New OpenRPC contracts**: `src/openrpc/discovery.json`, `src/openrpc/lifecycle2.json`, `src/openrpc/shared.json`
- **New OpenSpec module specs**: `openspec/specs/discovery/spec.md`, `openspec/specs/lifecycle2/spec.md` (shared already exists)
- **Dependencies**: `typescript`, `commander`, `@open-rpc/schema-utils-js` (build/dev only — no runtime deps)
- **Consumer trust**: Generated TypeScript headers must pass `tsc --noEmit`; C++ headers must compile with `-std=c++17`; Python stubs must pass `mypy --strict`
