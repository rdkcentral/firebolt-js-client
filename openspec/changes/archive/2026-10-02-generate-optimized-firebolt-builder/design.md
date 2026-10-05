## Context

`src/generators/inject-js.ts` emits the AST-derived runtime at `generated/inject-js/firebolt-inject.js`. WebKit instead embeds `webkitExtension/resources/firebolt-builder.js`, which currently has a separately maintained API surface and extension-specific runtime behavior. GResource packages the latter from a fixed source path, and the native bootstrap does not run the JavaScript generator.

The production artifact must therefore be regenerated explicitly before it is embedded. API definitions remain authored in OpenSpec and flow through OpenRPC and the Canonical AST; neither the production artifact nor its minifier becomes another API source of truth.

## Goals / Non-Goals

**Goals:**
- Emit the WebKit builder from the same Canonical AST and method-generation logic as the inject-js bundle.
- Preserve the factory contract consumed by `fireboltextension.cpp`, the bridge's `FireboltServiceManager` API, extension-schema support, and the specified event cancellation behavior.
- Include only `web` and `both` platform modules and methods.
- Produce a deterministic minified file at the resource path consumed by GResource.
- Make generation and stale-artifact detection part of the documented JavaScript build workflow.

**Non-Goals:**
- Change Firebolt API definitions or add APIs as part of this change.
- Change public TypeScript, ReScript, Kotlin/JS, C++, or Python outputs.
- Minify or otherwise transform `firebolt-bridge.js`.
- Make the CMake build install Node.js or silently invoke package installation.

## Decisions

### Reuse the Canonical AST and generator logic

Add a WebKit-builder generation mode that reuses the same AST traversal and method stub emitters as `inject-js`. The existing readable `firebolt-inject.js` output remains available. The WebKit mode emits a factory-returning script compatible with `evaluate_builder_script`; it does not maintain a second static module/API list. Native-only methods remain excluded according to AST platform metadata.

For example, an API method such as `Metrics.appInfo` follows this path:

```text
OpenSpec Metrics requirement
  -> src/openrpc/metrics.json
  -> Canonical AST method and parameter type
  -> shared method-pattern detection in inject-js generation
  -> WebKit builder method stub
  -> minified GResource input
```

No new AST node types or enum identifier rules are introduced.

### Keep the extension entry point as a generated profile

The WebKit profile keeps the current callable contract: evaluating the resource yields a factory; calling it with `{ transport, extensionSchema, enableDebug }` returns a builder with `build()`. The generated profile must not rely on a global `factory` property because the native extension consumes the evaluation result directly. `FireboltServiceManager` remains the bridge's responsibility.

Runtime behavior follows the generator requirements: event callbacks receive `(payload, false)`, cancellation receives `(null, true)`, extension-schema parse failures warn and continue, and cleanup cancels client-side listeners and pending calls without closing or resetting the transport connection. The generated output, rather than a hand-edited builder, is the place to resolve current behavior drift.

### Generate first, minify second, then embed

Add an explicit JavaScript generation command that builds the WebKit profile from the current OpenRPC inputs, writes an intermediate readable artifact under `generated/inject-js/`, and minifies it with a directly declared, lockfile-pinned Terser dependency into `webkitExtension/resources/firebolt-builder.js`. GResource continues to consume that stable path. The regular generation workflow runs this command so API changes refresh the extension resource as part of regeneration.

Minification uses deterministic options and does not apply unsafe semantic transforms. The generated resource remains a build artifact: runtime tests exercise both the readable source and the minified result, and CI checks that regeneration leaves no diff in the committed resource. CMake does not acquire a Node/npm installation dependency.

### Verify API and integration parity at generation boundaries

CI generates both `firebolt-inject.js` and the WebKit profile from the same Canonical AST. It compares their web/both module and method surfaces, parameter patterns, and shared RPC/event behavior; native-only APIs must be absent from both web outputs. The comparison is semantic rather than byte-for-byte: the WebKit profile may return its factory through the JavaScriptCore evaluation result instead of publishing the generic bundle's global `factory`, and its resource is minified.

Runtime tests evaluate the readable and minified WebKit outputs and verify the factory, transport, subscription/cancellation, extension-schema, and cleanup contracts. CI fails on API or shared-behavior mismatches, as well as when the checked-in minified resource is stale. These checks catch generator drift without comparing formatting-sensitive source strings.

## Risks / Trade-offs

- [The checked-in resource can become stale if a contributor skips generation] → Run generation from the standard npm generation command and have CI fail when regenerating changes the resource.
- [Minifier changes can alter JavaScript behavior or compatibility] → Pin the minifier, restrict transformations to safe compression/mangling, and execute the minified artifact in the same focused runtime tests as the readable output.
- [Generator and extension runtime contracts may differ in subtle lifecycle details] → Encode the current factory and event-cancellation contract in runtime tests before replacing the maintained implementation.
- [The generated resource is harder to review than readable source] → Keep the readable intermediate under `generated/inject-js/` and review behavior through generator tests and source diffs.

## Migration Plan

1. Add and test the WebKit generation profile while leaving the current resource in place.
2. Generate and verify the minified resource, then switch GResource consumption to the generated artifact at its existing path.
3. Add freshness validation to CI and document the generation command in the WebKit build instructions.
4. Remove the manually maintained builder implementation once parity checks pass; rollback is to restore the prior resource and disable the new generation/freshness step.

## Open Questions

- Confirm Terser's ECMAScript target against the oldest WPE/JSC runtime in the extension's support matrix.
- Confirm which CI job owns the freshness check for the WebKit resource, since the native bootstrap currently does not run JavaScript generation.