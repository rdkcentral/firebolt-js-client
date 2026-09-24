## Why

The current TypeScript type definition for the Firebolt inject-js bundle incorrectly exposes the internal factory pattern (factory function, FireboltTransport, FactoryConfig, etc.) instead of the actual public API that app developers use. The WPE WebKit extension implementation only exposes the global `FireboltServiceManager` object with `version` and `get()` methods, but the type definition does not match this reality. This causes type mismatches for developers trying to use the Firebolt API in WPE environments.

## What Changes

- **BREAKING**: Remove factory pattern exports from type definition (factory, FireboltTransport, FactoryConfig, ExtensionSchema)
- Add global `FireboltServiceManager` interface with `version: string` and `get(): Promise<FireboltClient>` properties
- Update reference app to use `FireboltServiceManager.get()` instead of direct factory pattern
- Update generator to produce type definition that matches the actual WPE implementation
- Keep all existing FireboltClient module namespaces and types unchanged

## Capabilities

### Modified Capabilities
- `wpe-inject-js-generator`: Update type definition generation to expose FireboltServiceManager global instead of factory pattern. The generator output must match the actual firebolt-bridge.js implementation that creates the global FireboltServiceManager object.

## Impact

- **Type definition**: `package/firebolt-inject.d.ts` - complete restructuring of exports
- **Reference app**: `references/firebolt-type-reference-app/src/main.ts` - update to use FireboltServiceManager pattern
- **Generator**: `src/generators/inject-js-types.ts` - update to generate correct type definition structure
- **Documentation**: Update package description to reflect FireboltServiceManager pattern instead of factory pattern
