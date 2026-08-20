## Why

The WPE Firebolt web extension needs a JavaScript bundle to inject into web pages that bridges the native `window.__firebolt_transport__` WebSocket interface with a high-level Firebolt API surface. The existing generator pipeline only produces static type declaration files; it cannot produce runtime JavaScript. This change adds a new generator target that emits a self-contained `firebolt-inject.js` bundle, driven by the Canonical AST, covering all web-platform modules with full schema validation.

## What Changes

- New `FullASTGenerator` type in the generator infrastructure — accepts the full `CanonicalAST` rather than a single `Module`, enabling whole-bundle generation in a single pass.
- New `inject-js` generator target (`src/generators/inject-js.ts`) that emits `out/inject-js/firebolt-inject.js`.
- The generated bundle exposes a frozen `window.FireboltServiceManager` global with three members:
  - `version` — semver string from the OpenRPC `info.version` field
  - `configure({ clientId })` — called by the WPE extension before the transport is injected; stores the security token
  - `get()` — returns `Promise<FireboltClient>` that resolves after the WebSocket connection is established
- The `FireboltClient` object returned by `get()` is a frozen, module-namespaced object (e.g., `firebolt.Localization`, `firebolt.Accessibility`) whose methods correspond 1-to-1 with the Canonical AST.
- `call` methods return `Promise<T>`. Params are validated against the AST schema before sending; results are validated on arrival.
- `subscribe` methods return `Promise<() => void>`. They register a callback, send a `listen: true` JSON-RPC request, and resolve the Promise only when the backend confirms with `{ id, result: null }`. The resolved unsubscribe function is synchronous.
- All communication uses Firebolt 9 JSON-RPC: event notifications arrive as `{ method, params }` (no `id`); call responses as `{ id, result/error }`.
- Primitive event payloads (string, number, bool, enum) are extracted from `params.value`; non-primitive payloads (objects and arrays) use `params` directly.
- `_methodRegistry` and `_typeSchemas` tables are the only generated sections; all transport plumbing is a static template within the generator.
- CLI `--targets` flag extended with `inject-js` target; only modules with `platform: "web" | "both"` are included.

## Capabilities

### New Capabilities

- `wpe-inject-js-generator`: Specification for the `inject-js` generator — structure of the generated `firebolt-inject.js` bundle, the `FireboltServiceManager` API contract, `FireboltClient` API contract, the JSON-RPC protocol used (Firebolt 9), schema validation rules for both directions, and the `_methodRegistry` / `_typeSchemas` data format emitted by the generator.

### Modified Capabilities

- `header-generation`: Add the `FullASTGenerator` contract — a second generator type that receives the full `CanonicalAST` (not a single `Module`) and is invoked once per run rather than once per module.
- `firebolt-cli`: Add the `inject-js` target to the CLI's `--targets` option, specifying output path and platform filtering behaviour (`web` + `both` only).

## Impact

- **New file**: `src/generators/inject-js.ts`
- **Modified**: `src/generators/index.ts` — add `FullASTGenerator` type, `registerFullASTGenerator`, `runAllFullAST`
- **Modified**: `src/cli.ts` — import `inject-js` generator, call `runAllFullAST` in the pipeline, extend `--targets` handling
- **Output artefact**: `out/inject-js/firebolt-inject.js` — runtime JavaScript, not a type declaration
- **No changes** to existing per-module generators (ts, res, kt, cpp, py) or the AST builder
- **No new runtime dependencies** — the generated bundle is plain ES5-compatible JavaScript
