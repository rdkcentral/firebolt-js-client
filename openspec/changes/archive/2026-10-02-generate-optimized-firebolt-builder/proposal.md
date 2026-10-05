## Why

The WebKit extension currently consumes a separately maintained `firebolt-builder.js`, so API additions and runtime behavior can drift from the generated inject-js bundle. The extension needs a reproducible production artifact that picks up API changes from the canonical spec pipeline and is optimized before it is embedded.

## What Changes

- Generate the WebKit extension builder artifact from the Canonical AST used by the inject-js generator, including only web and both-platform APIs.
- Preserve the extension-facing factory contract, transport callbacks, extension schema loading, and event cancellation semantics.
- Add a deterministic production minification step and connect its output to the WebKit GResource build input.
- Add a CI parity gate that compares the builder's API surface and shared runtime behavior with the generated `firebolt-inject.js`, allowing only documented WebKit-wrapper and minification differences.
- Add freshness checks so API updates do not require manually editing the builder API surface and stale generated output fails CI.

## Capabilities

### New Capabilities
- `webkit-extension-builder-artifact`: Production generation and packaging of the extension-consumed builder from canonical API definitions.

### Modified Capabilities
- `wpe-inject-js-generator`: Define the generated WebKit builder entry point and ensure runtime behavior matches the extension integration contract.

## Impact

- **Pipeline Impact:** OpenSpec API specs, OpenRPC documents, and the Canonical AST remain the API sources of truth. The JavaScript generator and WebKit packaging/build steps are affected; API updates flow through the existing pipeline into the extension artifact.
- **Target Languages:** JavaScript runtime output for WPE/WebKit changes. TypeScript, ReScript, Kotlin/JS, C++, and Python outputs are unchanged.
- **Modules in scope:** All Firebolt modules and methods marked `web` or `both`; native-only APIs remain excluded from the web extension builder.
- **Affected systems:** `src/generators/inject-js.ts` and its tests, generation scripts, `webkitExtension/resources/firebolt-builder.js` or its generated replacement, and the WebKit GResource build configuration.
- The production artifact must retain the factory contract consumed by `fireboltextension.cpp` and the public `FireboltServiceManager` bridge. Minification must not alter that contract or require a manually maintained API list.