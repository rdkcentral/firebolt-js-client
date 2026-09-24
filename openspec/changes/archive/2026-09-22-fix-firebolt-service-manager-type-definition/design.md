## Context

The current TypeScript type definition (`package/firebolt-inject.d.ts`) incorrectly exposes the internal factory pattern used by `firebolt-builder.js` instead of the actual public API that app developers interact with. The WPE WebKit extension implementation injects two JavaScript files:

1. `firebolt-builder.js` - Internal factory that accepts `{ transport, extensionSchema, enableDebug }` and returns `{ build(): Promise<FireboltClient> }`
2. `firebolt-bridge.js` - Public API that creates global `window.FireboltServiceManager` with `version` and `get()` methods

The bridge internally uses the factory pattern, but app developers should only interact with `FireboltServiceManager`. The current type definition exposes the factory pattern directly, which doesn't match the actual runtime behavior in WPE environments.

## Goals / Non-Goals

**Goals:**
- Update type definition to expose `FireboltServiceManager` global interface matching the actual WPE implementation
- Update reference app to demonstrate correct usage pattern with `FireboltServiceManager.get()`
- Update generator to produce type definitions that match the bridge implementation
- Maintain all existing FireboltClient module namespaces and types (no API changes)

**Non-Goals:**
- Changing the actual JavaScript implementation (firebolt-builder.js or firebolt-bridge.js)
- Changing the WPE extension C++ code
- Modifying the FireboltClient API or module structure
- Supporting factory pattern as a public API (it remains internal)

## Decisions

### Decision: Expose FireboltServiceManager as global interface
**Rationale:** The WPE extension only exposes the global `FireboltServiceManager` object. App developers cannot access the factory pattern directly. The type definition must match this reality to provide accurate TypeScript intellisense and type checking.

**Alternatives considered:**
- Keep factory pattern in type definition: Would cause type mismatches for actual WPE usage
- Expose both patterns: Would confuse developers about which to use
- Remove type definition entirely: Would lose TypeScript benefits

### Decision: Remove factory pattern exports completely
**Rationale:** The factory pattern is an internal implementation detail of the bridge. Exposing it in the type definition encourages incorrect usage patterns and doesn't match the actual runtime environment.

**Alternatives considered:**
- Mark factory pattern as @internal: Still exposes it in autocomplete
- Keep factory pattern for testing: Testing should use mocked FireboltServiceManager instead

### Decision: Update reference app to use FireboltServiceManager mock
**Rationale:** The reference app should demonstrate the correct usage pattern that app developers will use in production WPE environments. Using a mocked `FireboltServiceManager` global provides a realistic testing environment.

**Alternatives considered:**
- Keep factory pattern in reference app: Would demonstrate incorrect usage
- Remove reference app entirely: Would lose valuable testing/documentation

## Risks / Trade-offs

### Risk: Breaking change for existing users
**Mitigation:** This is a breaking change, but since the factory pattern was never actually usable in WPE environments (the bridge doesn't expose it), the impact is minimal. Users who were trying to use the factory pattern were already experiencing runtime errors.

### Risk: Generator complexity
**Mitigation:** The generator change is straightforward - we're changing the type definition template from factory exports to FireboltServiceManager global. The actual FireboltClient generation remains unchanged.

### Trade-off: Loss of factory pattern for non-WPE testing
**Rationale:** The factory pattern could be useful for testing outside of WPE environments, but this conflicts with the goal of matching the actual WPE implementation. Testing should use mocked FireboltServiceManager instead.

## Migration Plan

1. Update generator to produce new type definition structure
2. Regenerate `package/firebolt-inject.d.ts` 
3. Update reference app to use FireboltServiceManager mock
4. Update package documentation to reflect FireboltServiceManager pattern
5. Publish new version of `@firebolt-js/types` package

**Rollback strategy:** Keep previous version of package available. Users can pin to old version if needed during transition.

## Open Questions

None - the implementation pattern is well-defined by the existing firebolt-bridge.js code.
