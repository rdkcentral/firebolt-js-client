## Context

Currently, the inject-js generator emits a runtime validator (`_validate()` functions) that checks every API call against schemas before sending, validates every response from the backend, and filters event payloads before dispatch. This adds:

- Bundle size: validator code + `_typeSchemas` registry (can be hundreds of lines of ES5)
- Latency: every call executes recursive validation before the transport layer
- Complexity: schema derivation from AST, complex type recursion logic, separate validation error injection
- Inconsistency: validation happens in JS, but backend already validates; apps can bypass validation in other SDKs

The architectural insight: **Each layer should own correctness of its outputs.**

- **Backend owns request validation**: When app sends bad params, backend returns JSON-RPC error; app handles via Promise rejection
- **Backend owns response correctness**: Backend responds with correct types; if not, it's a backend bug, not something the client should hide
- **Platform owns event correctness**: WPE platform sends events; if malformed, it's a platform bug
- **Apps own their input**: TypeScript types guide developers; apps are responsible for passing correct data

## Goals / Non-Goals

**Goals:**
- Remove all runtime schema validation from inject-js bundle
- Reduce bundle size and latency
- Simplify code generation (no schema derivation, no validation recursion)
- Shift responsibility to appropriate layers (backend for validation, apps for type compliance)
- Preserve error handling: Promise rejections still flow from backend errors

**Non-Goals:**
- Remove TypeScript type definitions (they stay; types guide developers at compile time)
- Remove JSON-RPC error handling (error responses still reject Promises)
- Create a Certification App (separate proposal; separate work stream)
- Change the transport layer or event dispatch mechanism

## Decisions

### Decision 1: Remove all schema validation code paths

**What:** Delete the `_validate()` function and all its variants (`_validatePrimitive`, `_validateObject`, `_validateArray`, `_validateUnion`, `_validateEnum`).

**Where affected:**
- Line ~249–330 in `src/generators/inject-js.ts` (validator implementation)
- `collectTypeSchemas()` function that builds `_typeSchemas` registry
- Method registry generation: stop emitting `paramsSchema` and `resultSchema`
- Event registry generation: stop emitting `eventSchema`

**Rationale:** With validation owned by backend/platform, these are redundant. Removing them is straightforward: the call stubs simply send params without pre-validation; responses are passed through as-is; events dispatch without pre-filtering.

**Alternative considered:** Conditional validation (flag to enable/disable). Rejected: adds complexity, makes behavior unpredictable across deployments.

---

### Decision 2: Backend validation errors flow directly to Promise rejections

**What:** When backend responds with `{ id, error }`, the error is retransmitted to the app as a Promise rejection with `{ code, message }`.

**Current code pattern (Line ~376 in inject-js.ts):**
```javascript
transport.msgCb!(msg => {
  const pending = _pending[msg.id];
  if (msg.result !== undefined) {
    var valErr = _validate(msg.result, pending.resultSchema);  // REMOVE THIS
    if (valErr) {
      pending.reject(new Error("Invalid result: " + valErr));
      delete _pending[msg.id];
    } else {
      pending.resolve(msg.result);
    }
  }
  if (msg.error) {
    pending.reject(new Error(msg.error.message));  // KEEP THIS
  }
});
```

**After change:**
```javascript
transport.msgCb!(msg => {
  const pending = _pending[msg.id];
  if (msg.result !== undefined) {
    pending.resolve(msg.result);  // Pass through as-is
  }
  if (msg.error) {
    const err = new Error(msg.error.message);
    err.code = msg.error.code;
    pending.reject(err);  // Preserve error code
  }
});
```

**Rationale:** Errors from backend describe *why* the call failed; apps need this context. JSON-RPC errors (e.g., -32602 for invalid params) provide clear diagnostics.

**Alternative considered:** Wrap errors in a custom class (FireboltError). Rejected: unnecessary; standard Error with `code` property is sufficient and familiar.

---

### Decision 3: Event dispatch happens without validation; invalid events are sent as-is

**What:** Incoming notifications with a `method` field dispatch to all registered listeners immediately. No schema check. If payload is malformed, listener receives it as-is (listener code may fail or handle gracefully).

**Current code pattern (Line ~396 in inject-js.ts):**
```javascript
if (payload schema fails validation) {
  console.warn(...);
  // Do NOT dispatch
} else {
  dispatch to listeners
}
```

**After change:**
```javascript
// Always dispatch
for (const cb of _eventListeners[method]) {
  cb(payload);
}
```

**Rationale:** Events come from the platform, which is certified separately. If events are malformed, that's a platform issue to surface and fix—not something client code should silently drop. Listeners that expect a specific shape will fail or throw; that's appropriate.

**Trade-off:** Apps may receive malformed events if platform has a bug. *Mitigation:* Platform testing/certification catches these.

---

### Decision 4: No schema registry in the bundle

**What:** Stop generating `_typeSchemas` as part of the bundle. This registry was only used for validation `_ref` resolution.

**Rationale:** No validation → no registry needed. Reduces bundle size.

---

### Decision 5: Method registry is simplified

**What:** The `_methodRegistry` now only tracks:
- `kind` ("call" or "subscribe")
- `eventIsPrimitive` (for subscriptions: whether to unwrap `params.value`)

It no longer tracks `paramsSchema`, `resultSchema`, or `eventSchema`.

**Rationale:** These were only for validation. Event dispatch still needs `eventIsPrimitive` to know if `params` should be unwrapped as `params.value` (primitives) or passed directly (objects/arrays).

---

## Risks / Trade-offs

### Risk 1: Malformed data at runtime

**Issue:** Without validation, app receives garbage data from backend or platform without early warning.

**Example:** Backend mistakenly responds with `{ result: "not a number" }` for a method that should return `number`.

**Mitigation:**
- TypeScript types catch class-time errors (developer compiles code, type checker flags mismatch)
- Certification App (separate proposal) validates backend responses comprehensively before deployment
- Apps that encounter bad data fail fast (listener throws, code halts); failures are visible

**Acceptance:** This is acceptable because each layer owns its correctness.

---

### Risk 2: Lost debugging context

**Issue:** Previously, an app sending `{ language: 42 }` got `"Invalid params"` rejection immediately. Now it sends to backend, backend rejects with `"Invalid params"` JSON-RPC error.

**Difference:** Same error message, slightly later (network round-trip), but preserved in the Promise rejection.

**Mitigation:** Backend error includes `code` (e.g., -32602) which identifies the error type. Developers see the error; they debug by checking their types.

**Acceptance:** This is acceptable; round-trip is still fast, and error context is preserved.

---

### Risk 3: Larger backend error surface

**Issue:** Without client-side validation, invalid requests reach the backend more often.

**Mitigation:**
- Backend is designed to validate and reject invalid requests
- This is not a new risk; backend already handles invalid requests from apps using other SDKs or old versions
- If backend load becomes a concern, it's addressed at the platform level (rate limiting, load shedding)

**Acceptance:** This is acceptable; backend-side validation is standard practice.

---

## Migration Plan

This is a breaking change (validation behavior changes), but since firebolt-js-client is not yet deployed to production:

1. **Update specs**: Remove validation requirements from `wpe-inject-js-generator/spec.md`
2. **Update generator**: Remove validator code from `src/generators/inject-js.ts`
3. **Update tests**: Remove tests for validation (5.10, 5.11, 5.17); keep tests for error handling
4. **Update derived files**: Run generator to update OpenRPC, if needed
5. **Developer communication**: Document that validation moved to backend; apps should handle Promise rejections with backend error info

**Rollback:** If needed, revert the commits. No deployed instances to worry about.

---

## Open Questions

1. Should the `code` property on rejected Errors be normalized/typed, or just passed through from JSON-RPC?
   - *Tentative:* Pass through; let consumers inspect `error.code` for JSON-RPC codes

2. Should the `_methodRegistry` still be generated if events are still dispatched without validation?
   - *Tentative:* Yes; `eventIsPrimitive` is still needed to unwrap primitives

3. Will there be metrics/observability for events that fail listener dispatch?
   - *Tentative:* Out of scope; app listening code can add try/catch
