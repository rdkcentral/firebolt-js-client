## 1. Generator Infrastructure

- [x] 1.1 [generator] Add `FullASTGenerator` type `(ast: CanonicalAST, config: GenConfig) => GeneratorOutput[]` to `src/generators/index.ts`
- [x] 1.2 [generator] Add `registerFullASTGenerator(id, gen, targetPlatform)` and full-AST registry map to `src/generators/index.ts`
- [x] 1.3 [generator] Add `runAllFullAST(ast, config, targets?)` dispatch function to `src/generators/index.ts` — invokes each registered full-AST generator exactly once per run

## 2. CLI Extension

- [x] 2.1 [generator] Import `./generators/inject-js` in `src/cli.ts` (side-effect registration)
- [x] 2.2 [generator] Call `runAllFullAST(ast, config, targets)` in `src/cli.ts` after the existing `runAll` call, passing the full `CanonicalAST`
- [x] 2.3 [generator] Write full-AST generator outputs inside the existing file-write loop in `src/cli.ts`

## 3. inject-js Generator — Scaffold and Schema Emitter

- [x] 3.1 [generator] Create `src/generators/inject-js.ts` with the `FullASTGenerator` function signature and a `registerFullASTGenerator("inject-js", generate, "web")` call
- [x] 3.2 [generator] Implement `typeRefToSchemaNode(ref: TypeRef, types: TypeDecl[]): SchemaNode` — converts an AST `TypeRef` to the runtime schema descriptor object (handles primitive, named, array, optional, union)
- [x] 3.3 [generator] Implement `typeDeclToSchemaNode(decl: TypeDecl): SchemaNode` — converts an AST `TypeDecl` to schema (handles enum, object, union, scalar-alias, array-alias)
- [x] 3.4 [generator] Implement `isEventIsPrimitive(ref: TypeRef, types: TypeDecl[]): boolean` — returns `true` for `PrimitiveRef`, `NamedRef→EnumTypeDecl`, and `NamedRef→ScalarAliasDecl`; returns `false` for `ArrayRef` and `NamedRef→ObjectTypeDecl` (arrays arrive as `params` directly, same as objects)
- [x] 3.5 [generator] Implement `collectTypeSchemas(modules: Module[]): string` — emits the `var _typeSchemas = { ... }` block keyed as `"ModuleName.TypeName"` for all named types referenced by web/both modules (including Shared)
- [x] 3.6 [generator] Implement `emitMethodRegistry(modules: Module[]): string` — emits the `var _methodRegistry = { ... }` block with `kind`, `paramsSchema`, `resultSchema` (call) or `eventSchema`, `eventIsPrimitive` (subscribe) per method
- [x] 3.7 [generator] Implement `emitVersionVar(version: string): string` — emits `var _VERSION = "<semver>";`
- [x] 3.8 [generator] Write the static preamble template string in `inject-js.ts` — includes: private state variables (`_clientId`, `_connecting`, `_connected`, `_fireboltInstance`, `_connectionResolvers`, `_nextId`, `_pendingCalls`, `_eventListeners`), `_validate()`, `_validatePrimitive()`, `_validateObject()`, `_validateArray()`, `_validateUnion()`, `_validateEnum()`, `_resolveRef()`
- [x] 3.9 [generator] Write the static runtime template string — includes: `_rpcCall()`, `_subscribe()`, `_onMessage()`, `_onStatus()`, `_makeCallStub()`, `_makeSubscribeStub()`, `_buildFireboltInstance()`, `_configure()`, `_get()`
- [x] 3.10 [generator] Write the static postamble template string — freeze the `FireboltServiceManager` object with `Object.freeze()`, then attach it to `global` using `Object.defineProperty(global, "FireboltServiceManager", { value: <frozen_fsm>, writable: false, configurable: false, enumerable: true })` so the global property itself cannot be replaced or deleted; wrap everything in the IIFE `(function(global){ ... })(typeof globalThis !== 'undefined' ? globalThis : window);`
  - Note: `Object.freeze()` alone is sufficient for `FireboltClient` and module namespaces (they are not global properties); `Object.defineProperty` is only required for attaching `FireboltServiceManager` to `global`
- [x] 3.11 [generator] Assemble `generate(ast, config)` — filter modules to `web`/`both` platform, combine preamble + generated data + runtime + postamble, return `GeneratorOutput` at `inject-js/firebolt-inject.js`

## 4. Tests — Generator Infrastructure

- [x] 4.1 [test] Test `registerFullASTGenerator` + `runAllFullAST`: registered generator is called exactly once with the full AST when three modules are present
- [x] 4.2 [test] Test `runAllFullAST` target filter: `targets: ["inject-js"]` invokes only the inject-js generator and does not call per-module generators
- [x] 4.3 [test] Test `runAllFullAST` with no matching target: throws with a clear error message

## 5. Tests — inject-js Generator Output

- [x] 5.1 [test] `_VERSION` in generated output matches `ast.version`
- [x] 5.2 [test] `FireboltServiceManager` is frozen and has `version`, `configure`, `get` as its only enumerable properties
- [x] 5.3 [test] `get()` before `configure()` throws a synchronous `Error`
- [x] 5.4 [test] `configure()` called before `__firebolt_transport__` exists does not throw
- [x] 5.5 [test] `get()` resolves with FireboltClient only after transport emits `"connected"` (mock transport)
- [x] 5.6 [test] Multiple concurrent `get()` callers all resolve with the same object reference (singleton)
- [x] 5.7 [test] `get()` after connection is established resolves immediately with the existing singleton
- [x] 5.8 [test] `FireboltClient` is frozen; module namespaces are frozen; native-only modules are absent
- [x] 5.9 [test] Call method stub sends correct JSON-RPC `{ jsonrpc, id, method, params }` via transport.send
- [x] 5.10 [test] Call method stub rejects Promise when params fail schema validation (outbound)
- [x] 5.11 [test] Call method stub rejects Promise when result fails schema validation (inbound)
- [x] 5.12 [test] Call method stub rejects Promise when backend returns `{ id, error }`
- [x] 5.13 [test] Subscribe stub sends `{ listen:true }` and resolves with unsubscribeFn on `{ id, result: null }` ack
- [x] 5.14 [test] Subscribe stub rejects Promise and removes listener when backend returns `{ id, error }`
- [x] 5.15 [test] Event notification with primitive payload dispatches `params.value` to registered callbacks
- [x] 5.16 [test] Event notification with object payload dispatches `params` (full object) to registered callbacks
- [x] 5.16b [test] Event notification with array payload dispatches `params` (the array) to registered callbacks — `eventIsPrimitive` is `false` for `ArrayRef`
- [x] 5.17 [test] Event payload that fails `eventSchema` validation is not dispatched (console.warn issued)
- [x] 5.18 [test] Calling unsubscribeFn removes the callback and sends `{ listen:false }` when no listeners remain
- [x] 5.19 [test] Calling unsubscribeFn does NOT send `{ listen:false }` when other listeners for the same event still exist
