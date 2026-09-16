## Why

The inject-js generator currently produces a single parameter pattern for all Firebolt methods, requiring no-param methods to be called with empty objects (e.g., `Accessibility.audioDescription({})`). This reduces ergonomics and deviates from common JavaScript patterns where getter-like methods with no parameters are called without arguments. The change improves developer experience while maintaining JSON-RPC consistency for methods with parameters.

## What Changes

- **Enhanced method stub generation**: The inject-js generator will now produce two distinct parameter patterns:
  - No-param methods: `function() { return _rpcCall(methodName, {}); }` - called as `method()`
  - Single-param methods: `function(param) { return _rpcCall(methodName, param || {}); }` - called as `method(value)` or `method({ object })`
- **Method registry enhancement**: Add `paramCount` metadata to `_methodRegistry` entries to enable pattern selection
- **Stub factory addition**: Create `_makeCallStubNoParams()` factory for no-param methods
- **Instance builder update**: Modify `_buildFireboltInstance()` to select appropriate stub factory based on parameter count
- **Test coverage**: Add tests for no-param methods, single-param with primitive values, and single-param with object values

**Backward Compatibility**: Existing code using empty objects for no-param methods will continue to work. The change is additive, not breaking.

## Capabilities

### New Capabilities
None - this is a generator implementation improvement, not a new Firebolt API capability.

### Modified Capabilities
- `wpe-inject-js-generator`: Update the inject-js generator specification to support dual parameter patterns (no-param and single-param) instead of the current single pattern approach.

## Impact

- **Generator code**: `src/generators/inject-js.ts` - modified to support parameter pattern selection
- **Test code**: `src/generators/inject-js.test.ts` - added tests for new parameter patterns
- **Generated output**: `generated/inject-js/firebolt-inject.js` - will include new stub factory functions and updated instance building logic
- **Documentation**: `openspec/specs/_meta/inject-js-parameter-patterns.md` - created to document the parameter patterns
- **User code**: Minimal impact - existing code continues to work, new code can use cleaner no-param syntax
- **Dependencies**: No new dependencies required
