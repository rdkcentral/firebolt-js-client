## 1. Generator Implementation

- [x] 1.1 [generator] Update inject-js-types generator to remove factory pattern exports (factory, FireboltTransport, FactoryConfig, ExtensionSchema)
- [x] 1.2 [generator] Update inject-js-types generator to add global FireboltServiceManager interface with version property
- [x] 1.3 [generator] Update inject-js-types generator to add get() method to FireboltServiceManager interface
- [x] 1.4 [generator] Update inject-js-types generator to declare FireboltServiceManager as global readonly variable
- [x] 1.5 [generator] Ensure FireboltClient and all module namespaces remain unchanged in type definition
- [x] 1.6 [generator] Regenerate package/firebolt-inject.d.ts using updated generator

## 2. Reference App Updates

- [x] 2.1 [test] Create mock FireboltServiceManager global in reference app
- [x] 2.2 [test] Update reference app main.ts to use FireboltServiceManager.get() instead of factory pattern
- [x] 2.3 [test] Remove mock transport and factory pattern usage from reference app
- [x] 2.4 [test] Update reference app to demonstrate FireboltServiceManager.version usage
- [x] 2.5 [test] Build reference app to verify TypeScript compilation with new type definition

## 3. Documentation Updates

- [x] 3.1 [generator] Update package/package.json description to reflect FireboltServiceManager pattern
- [x] 3.2 [generator] Update package/README.md to document FireboltServiceManager usage pattern
- [x] 3.3 [generator] Update package/examples to use FireboltServiceManager pattern

## 4. Verification

- [x] 4.1 [test] Run TypeScript compiler on reference app to verify no type errors
- [x] 4.2 [test] Verify type definition exports match expected FireboltServiceManager structure
- [x] 4.3 [test] Verify factory pattern exports are removed from type definition
