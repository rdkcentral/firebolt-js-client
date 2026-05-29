## Context

The existing generator pipeline dispatches each `Module` individually to registered per-module generators (TypeScript, ReScript, Kotlin/JS, C++, Python), emitting type declaration files. The WPE Firebolt extension requires a runtime JavaScript bundle (`firebolt-inject.js`) that covers all web-platform modules in a single file — something the current per-module dispatch cannot produce without architectural extension.

The bundle must expose `window.FireboltServiceManager` before `window.__firebolt_transport__` is available (the extension calls `configure()` first, then injects the transport), and must use the Firebolt 9 JSON-RPC protocol for all communication.

No existing generator type, registry entry, or CLI flag covers this use case.

## Goals / Non-Goals

**Goals:**
- Introduce a `FullASTGenerator` type alongside the existing per-module `Generator` type, with its own registry and `runAllFullAST` dispatch
- Implement the `inject-js` generator producing an ES5-compatible IIFE bundle at `out/inject-js/firebolt-inject.js`
- Bundle exposes a frozen `FireboltServiceManager` and a frozen `FireboltClient` derived from the full Canonical AST (web-platform modules only)
- Schema validation in both directions for all method params, call results, and event payloads; full recursive depth
- Support Firebolt 9 JSON-RPC: notifications (`{ method, params }`) for events; `{ id, result: null }` ack for subscribe

**Non-Goals:**
- Minification, source maps, or dead-code elimination (post-processing concerns)
- Automatic reconnection on transport disconnect
- TypeScript types for the generated bundle itself
- Support for `platform: "native"` modules in the inject file

## Decisions

### Decision 1: `FullASTGenerator` type alongside per-module `Generator`

The inject-js generator needs all modules at once. Introducing a clean second type avoids compromising the purity contract of the existing type.

```typescript
// New type
type FullASTGenerator = (ast: CanonicalAST, config: GenConfig) => GeneratorOutput[];

// New registry and dispatch added to generators/index.ts
registerFullASTGenerator(id: string, gen: FullASTGenerator, targetPlatform: "web" | "native"): void
runAllFullAST(ast: CanonicalAST, config: GenConfig, targets?: string[]): GeneratorOutput[]
```

`cli.ts` calls `runAllFullAST(ast, config, targets)` after the existing `runAll(ast.modules, config, targets)` call.

**Alternative rejected**: Passing the full AST via `GenConfig.ast?: CanonicalAST` — generators would ignore their primary argument, and the type system would permit calling full-AST generators per-module accidentally.

---

### Decision 2: Data-driven `_methodRegistry` + `_typeSchemas` as the only generated section

The generator emits two data tables and uses a static generic runtime (embedded in the generator as a template string). Only `_VERSION`, `_typeSchemas`, and `_methodRegistry` are synthesized from the AST; all transport plumbing, validation logic, and stub factories are static template code.

```
firebolt-inject.js structure:
  [STATIC PREAMBLE]   — private state, _validate(), _rpcCall(), _subscribe(),
                        _onMessage(), _onStatus(), stubs, _configure(), _get()
  [GENERATED DATA]    — _VERSION, _typeSchemas{}, _methodRegistry{}
  [STATIC POSTAMBLE]  — FireboltServiceManager frozen via Object.freeze(), then attached
                         to global via Object.defineProperty (writable:false, configurable:false)
                         so the global property itself cannot be replaced or deleted
```

**Alternative rejected**: Per-method generated stubs/validators — the output grows proportionally to method count with no differentiated logic; the data-driven approach scales identically.

---

### Decision 3: `configure()` stores `clientId` only; transport accessed lazily in `get()`

WPE extension lifecycle: `configure({ clientId })` is called *before* `window.__firebolt_transport__` is injected. Therefore `configure()` cannot call any transport method. All transport initialization (registering `onMessage`, `onConnectionStatus`, calling `connect()`) is deferred to the first `get()` call.

```
configure({ clientId })     → stores _clientId only
   ↓ (extension injects __firebolt_transport__)
get()                       → reads window.__firebolt_transport__
                              registers onMessage + onConnectionStatus
                              calls connect()
                              returns Promise that resolves on "connected"
```

---

### Decision 4: Subscribe is `async` — resolves with unsubscribe function on `null` ack

Firebolt 9 confirms subscriptions with `{ id, result: null }`. The subscribe stub returns `Promise<() => void>` so that subscription errors (unauthorized event, unknown method) can be surfaced as Promise rejections rather than being silently lost.

```
firebolt.Localization.onCountryChanged(cb)
  → sends { id:N, method:"Localization.onCountryChanged", params:{ listen:true } }
  → awaits { id:N, result: null }
  → resolves with synchronous unsubscribeFn
```

The unsubscribe function sends `{ listen: false }` fire-and-forget and removes the callback from `_eventListeners`. The listen:false ack from the backend (also `{ id, result: null }`) is tracked via `_pendingCalls` with `isSubscribe: true` to prevent spurious "unknown id" warnings.

**Alternative rejected**: Synchronous subscribe (return unsubscribe immediately, fire-and-forget `listen: true`). Rejected because subscription failures would be silently lost.

---

### Decision 5: Firebolt 9 event routing via `method` field (notifications)

Events arrive as `{ method, params }` with no `id`. Call responses arrive with `id`. This distinction removes the need for a separate event-stream tracking map.

```
_onMessage router:
  has id → _pendingCalls[id].isSubscribe?  → subscribe ack (result:null) → resolve with unsubscribeFn
                                            → error              → reject, remove listener
                            !isSubscribe?  → validate result, resolve/reject
  no id, has method → event notification
    extract payload: eventIsPrimitive ? params.value : params
    validate against eventSchema → on failure: log warning, do NOT dispatch
    dispatch to _eventListeners[method]
```

---

### Decision 6: `eventIsPrimitive` flag for payload extraction

Firebolt 9 wraps non-object event payloads in `{ params: { value: <payload> } }` and sends object payloads as `{ params: <object> }`. The generator determines which case applies from the AST `TypeRef` at code-gen time:

| TypeRef (innermost after unwrapping Optional) | `eventIsPrimitive` |
|---|---|
| `PrimitiveRef` | `true` |
| `NamedRef` → `EnumTypeDecl` | `true` |
| `NamedRef` → `ScalarAliasDecl` | `true` |
| `ArrayRef` | `false` |
| `NamedRef` → `ObjectTypeDecl` | `false` |

Arrays arrive as `params` directly (JSON-RPC params IS the array); only scalar/enum values are wrapped in `{ value: <payload> }`.

---

### Decision 7: Named types keyed as `"Module.TypeName"` in `_typeSchemas`

Fully-qualified keys prevent name collisions when types from multiple modules share a name. The Shared module is processed as a standard component. Cross-module `NamedRef` nodes (where `ref.module` is set) resolve to `"Module.TypeName"` keys.

---

### Pipeline Trace: `Localization.onCountryChanged`

```
1. OpenSpec (localization/spec.md)
   event: onCountryChanged — ISO 3166-1 alpha-2 country code

2. OpenRPC (localization.json)
   { "name": "Localization.onCountryChanged",
     "params": [{ "name": "listen", "required": true, "schema": { "type": "boolean" } }],
     "result": { "schema": { "oneOf": [
       { "$ref": "shared.json#/components/schemas/ListenResponse" },
       { "type": "string", "minLength": 2, "maxLength": 2, "pattern": "^[A-Z]{2}$" }
     ]}} }

3. Canonical AST
   Module: Localization, Method: {
     name: "onCountryChanged", kind: "subscribe", params: [],
     result: PrimitiveRef { primitive:"string",
               constraints: { minLength:2, maxLength:2, pattern:"^[A-Z]{2}$" } }
   }
   (listen param stripped; ListenResponse stripped from oneOf)

4. inject-js generator → _methodRegistry entry
   "Localization.onCountryChanged": {
     kind: "subscribe",
     eventIsPrimitive: true,
     eventSchema: { kind:"primitive", type:"string",
                    constraints:{ minLength:2, maxLength:2, pattern:"^[A-Z]{2}$" } }
   }

5. Runtime behaviour
   const unsubscribe = await firebolt.Localization.onCountryChanged(cb);
   → sends  { jsonrpc:"2.0", id:3, method:"Localization.onCountryChanged", params:{listen:true} }
   ← receives { jsonrpc:"2.0", id:3, result:null }  → resolves; unsubscribe fn returned
   ← receives { jsonrpc:"2.0", method:"Localization.onCountryChanged", params:{value:"US"} }
   → extracts "US" (eventIsPrimitive → params.value)
   → validates: string, length 2, matches ^[A-Z]{2}$  → passes
   → dispatches "US" to cb
```

---

### `_typeSchemas` Schema Node Format

The generator emits schema descriptors using the following node kinds (matching AST TypeDecl/TypeRef):

```js
{ kind: "primitive", type: "bool"|"string"|"number",
  constraints?: { minLength?, maxLength?, pattern?, minimum?, maximum? } }
{ kind: "ref",       name: "Module.TypeName" }
{ kind: "object",    properties: { <name>: <node> }, required: string[] }
{ kind: "array",     items: <node> }
{ kind: "optional",  inner: <node> }
{ kind: "union",     variants: <node>[] }
{ kind: "enum",      values: string[] }
{ kind: "null" }
```

Union validation: try each variant sequentially; pass if any match.

## Risks / Trade-offs

- **Bundle size scales with method count** → data tables are compact (no function bodies); minification is downstream.
- **Schema version drift**: backend may return valid-but-schema-mismatched data after an update deployed before a new bundle. Call result validation errors reject the Promise (fail-closed). Event payload validation failures log a warning but do NOT dispatch to user callbacks (fail-closed for events too, to prevent apps acting on malformed data).
- **`get()` throws synchronously before `configure()`**: unusual for a Promise-returning function. Documented as a precondition; the WPE extension lifecycle guarantees ordering.
- **Transport disconnect after `get()` resolves**: subsequent calls on the Firebolt object fail silently (transport drops messages when disconnected). Reconnection is out of scope; the extension owns that lifecycle.
