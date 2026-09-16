## 1. Generator Implementation

- [x] 1.1 [generator] Add helper functions to generate parameter interfaces with MethodParams naming convention in typescript.ts
- [x] 1.2 [generator] Modify emitCallMethod in typescript.ts to use single object parameter for all methods with parameters
- [x] 1.3 [generator] Modify emitSubscribeMethod in typescript.ts to use two-parameter callback signature (event, cancelled: boolean)
- [x] 1.4 [generator] Update emitModuleNamespace in typescript.ts to emit parameter interfaces before method declarations
- [x] 1.5 [generator] Add JSDoc @example generation with emitExample function in typescript.ts
- [x] 1.6 [generator] Add generateExampleValue function with realistic parameter value generation in typescript.ts
- [x] 1.7 [generator] Apply the same changes to inject-js-types.ts for consistency
- [x] 1.8 [generator] Update emitCallMethod in inject-js-types.ts to use single object parameter pattern
- [x] 1.9 [generator] Update emitSubscribeMethod in inject-js-types.ts to use two-parameter callback signature
- [x] 1.10 [generator] Add JSDoc @example generation to inject-js-types.ts
- [x] 1.11 [generator] Add generateExampleValue function to inject-js-types.ts
- [x] 1.12 [generator] Fix Metrics module parameter interfaces to avoid incorrect primitive type mappings
- [x] 1.13 [generator] Add Firebolt namespace export to inject-js-types.ts emitExportStatements

## 2. Build and Generate

- [x] 2.1 [generator] Build the TypeScript generators with npm run build
- [x] 2.2 [generator] Regenerate all TypeScript definitions with npm run generate
- [x] 2.3 [generator] Copy updated inject-js definitions to package folder

## 3. Verification

- [x] 3.1 [generator] Verify generated Actions.d.ts uses object parameter pattern
- [x] 3.2 [generator] Verify generated Discovery.d.ts uses object parameter pattern
- [x] 3.3 [generator] Verify generated Metrics.d.ts uses object parameter pattern
- [x] 3.4 [generator] Verify event callbacks use two-parameter signature
- [x] 3.5 [generator] Verify parameter interfaces are under Firebolt.Module namespace
- [x] 3.6 [generator] Verify JSDoc examples are present for methods with parameters
- [x] 3.7 [generator] Verify Firebolt namespace is exported in inject-js definitions