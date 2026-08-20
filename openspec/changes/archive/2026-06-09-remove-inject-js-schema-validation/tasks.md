## 1. Specification Updates

- [x] 1.1 [spec] Remove "Requirement: Call method stubs validate both directions" from openspec/specs/wpe-inject-js-generator/spec.md
- [x] 1.2 [spec] Remove "Requirement: Schema validation is fully recursive" from openspec/specs/wpe-inject-js-generator/spec.md
- [x] 1.3 [spec] Remove "Requirement: Event notifications validate payloads before dispatch" from openspec/specs/wpe-inject-js-generator/spec.md
- [x] 1.4 [spec] Update "Requirement: Call method stubs send JSON-RPC..." to remove pre-validation language and result validation language
- [x] 1.5 [spec] Update "Requirement: Event notifications are routed by method field" to remove validation language; keep payload extraction

## 2. Generator Implementation

- [x] 2.1 [generator] Remove `function typeRefToSchemaNode()` from src/generators/inject-js.ts (Task 3.2)
- [x] 2.2 [generator] Remove `SchemaNode` type definition from src/generators/inject-js.ts
- [x] 2.3 [generator] Remove `collectTypeSchemas()` function from src/generators/inject-js.ts; remove schema generation in main flow
- [x] 2.4 [generator] Remove `_typeSchemas` registry from STATIC_PREAMBLE
- [x] 2.5 [generator] Remove `_validate()` function and all helper functions from STATIC_PREAMBLE (`_validatePrimitive`, `_validateObject`, `_validateArray`, `_validateUnion`, `_validateEnum`, `_resolveRef`)
- [x] 2.6 [generator] Update `methodParamsSchema()` to return null (no longer generate schemas)
- [x] 2.7 [generator] Update `emitMethodRegistry()` to emit only `kind` and `eventIsPrimitive` for each method (remove `paramsSchema`, `resultSchema`, `eventSchema`)
- [x] 2.8 [generator] Update message handler in STATIC_PREAMBLE (~line 375) to remove validation on response result; pass result through as-is
- [x] 2.9 [generator] Update message handler to preserve error.code when rejecting on backend error
- [x] 2.10 [generator] Update event notification handler (~line 396) to remove validation; dispatch payload directly to listeners

## 3. Test Updates

- [x] 3.1 [test] Remove test "5.10 call stub rejects on invalid params" from src/generators/inject-js.test.ts
- [x] 3.2 [test] Remove test "5.11 call stub rejects on invalid result" from src/generators/inject-js.test.ts
- [x] 3.3 [test] Remove test "5.17 invalid event payload is not dispatched and console.warn is called" from src/generators/inject-js.test.ts
- [x] 3.4 [test] Add test: "5.10 call stub sends params without validation" (verify params sent as-is without pre-check)
- [x] 3.5 [test] Add test: "5.11 call stub passes result through without validation" (verify result resolved as-is)
- [x] 3.6 [test] Add test: "5.12 call stub preserves backend error.code in rejection" (verify error object includes code)
- [x] 3.7 [test] Add test: "5.17 event with invalid payload is dispatched as-is" (verify listener receives bad data, no filtering)
- [x] 3.8 [test] Run all existing tests to verify error handling flow still works (subscriptions, unsubscriptions, acks)

## 4. Code Cleanup

- [x] 4.1 [generator] Remove unused imports from src/generators/inject-js.ts if any (e.g., if schema types are no longer referenced)
- [x] 4.2 [generator] Update code comments if they reference validation behavior
- [x] 4.3 [test] Verify consistency.test.ts and inject-js-infra.test.ts still pass with simplified generator output

## 5. Verification

- [x] 5.1 [generator] Run generator against test AST; verify bundle size reduction (no validator code, no schema registry)
- [x] 5.2 [generator] Spot-check generated bundle: confirm _validate() functions are absent, _typeSchemas is absent
- [x] 5.3 [test] Run full test suite: `npm test src/generators/inject-js.test.ts`
- [x] 5.4 [generator] Verify _methodRegistry contains only `kind` and `eventIsPrimitive`; no `paramsSchema`, `resultSchema`, `eventSchema`
