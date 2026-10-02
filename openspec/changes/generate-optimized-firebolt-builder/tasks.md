## 1. Generator Profile

- [x] 1.1 [generator] Refactor inject-js module traversal and method-pattern emission so the regular target and WebKit builder profile share Canonical AST logic.
- [x] 1.2 [generator] Add the WebKit builder profile output under `generated/inject-js/`, returning the factory expected by JavaScriptCore without publishing a global `factory`.
- [x] 1.3 [generator] Align generated runtime behavior with the extension contract for extension-schema parse errors, event callback cancellation, connection cleanup, and transport closure.

## 2. Production Artifact

- [x] 2.1 [generator] Add Terser as a direct, lockfile-pinned development dependency and configure deterministic minification for the oldest supported WPE/JSC runtime.
- [x] 2.2 [generator] Add a generation command that minifies the readable WebKit profile into `webkitExtension/resources/firebolt-builder.js`, and include it in the standard `npm run generate` workflow.
- [x] 2.3 [generator] Document the generation prerequisite for native builds and retain the existing GResource resource path and bridge integration.

## 3. Validation

- [x] 3.1 [test] Add generator tests proving API parity for web/both methods, native-only exclusion, and the existing parameter patterns, including primitive wrapping.
- [x] 3.2 [test] Exercise readable and minified artifacts with mock transports for factory/build behavior, RPC calls, extension schemas, events/cancellation, and cleanup.
- [x] 3.3 [test] Add a CI parity gate that generates `firebolt-inject.js` and the WebKit builder from the same AST, compares API surfaces and shared runtime behavior, and fails with a useful mismatch report.
- [x] 3.4 [test] Add CI freshness validation that fails when regeneration changes the committed WebKit resource, and verify the GResource build embeds that resource.