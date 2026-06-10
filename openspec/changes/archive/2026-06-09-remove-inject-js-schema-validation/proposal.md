## Why

Runtime schema validation in inject-js adds unnecessary complexity and latency. Each architectural layer should own correctness of its outputs: the backend validates request parameters and certifies response correctness; apps validate their own input before calling Firebolt APIs; the platform (WPE) guarantees event payload correctness. Pushing validation down to each responsible layer simplifies the code generator, reduces bundle size, and enables faster API calls.

## What Changes

- **BREAKING**: Inject-js no longer validates request parameters before sending to backend
- **BREAKING**: Inject-js no longer validates response payloads from the backend
- **BREAKING**: Inject-js no longer validates event payloads before dispatching to listeners
- Schema generation infrastructure (`_typeSchemas`, `_validate()` functions) is removed from the bundle
- Backend validation errors (JSON-RPC error responses) are retransmitted to apps as Promise rejections with `{ code, message }`
- Error handling and Promise rejection flow remains unchanged; only pre-validation is removed

## Capabilities

### New Capabilities

<!-- None: this is a simplification, not a new capability -->

### Modified Capabilities

- `wpe-inject-js-generator`: Removed all schema validation requirements; backend error responses flow through as-is to Promise rejections; type schemas no longer generated

## Impact

- **Code generation**: Simplifies inject-js generator, smaller bundle output
- **API contract**: Backend becomes the single source of truth for schema validation
- **Error handling**: Apps receive JSON-RPC errors directly instead of injected validation errors
- **Types**: TypeScript/ReScript types remain for developer experience; no runtime validation
- **Testing**: Certification moved to separate Certification App (separate proposal)
- **Scope**: WPE inject-js generator and wpe-inject-js-generator spec only
