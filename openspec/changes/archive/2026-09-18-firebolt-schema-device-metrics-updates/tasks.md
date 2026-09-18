## 1. Spec Updates

- [x] 1.1 [spec] Update openspec/specs/metrics/spec.md - Add entityId and agePolicy to startContent action
- [x] 1.2 [spec] Update openspec/specs/metrics/spec.md - Add entityId and agePolicy to stopContent action
- [x] 1.3 [spec] Update openspec/specs/metrics/spec.md - Rename pageName to pageId and add agePolicy to page action
- [x] 1.4 [spec] Update openspec/specs/metrics/spec.md - Replace error action parameters with new structure (type, code, description, visible, parameters, agePolicy)
- [x] 1.5 [spec] Update openspec/specs/metrics/spec.md - Add target parameter to mediaSeeking action
- [x] 1.6 [spec] Update openspec/specs/metrics/spec.md - Add position parameter to mediaSeeked action
- [x] 1.7 [spec] Update openspec/specs/metrics/spec.md - Add rate parameter to mediaRateChanged action
- [x] 1.8 [spec] Update openspec/specs/metrics/spec.md - Add bitrate, width, height, profile parameters to mediaRenditionChanged action
- [x] 1.9 [spec] Update openspec/specs/metrics/spec.md - Replace event action parameters with schema and data
- [x] 1.10 [spec] Update openspec/specs/metrics/spec.md - Replace agePolicy with build parameter in appInfo action
- [x] 1.11 [spec] Update openspec/specs/metrics/spec.md - Replace ErrorType enum values (network, media, restriction, entitlement, other)
- [x] 1.12 [spec] Update openspec/specs/shared/spec.md - Add AgePolicy type definition
- [x] 1.13 [spec] Update openspec/specs/discovery/spec.md - Update watched action to reference shared AgePolicy
- [x] 1.14 [spec] Update openspec/specs/wpe-inject-js-generator/spec.md - Add single-primitive-wrap pattern requirements

## 2. OpenRPC Schema Updates

- [x] 2.1 [openrpc] Update src/openrpc/shared.json - Add AgePolicy schema to components/schemas
- [x] 2.2 [openrpc] Update src/openrpc/discovery.json - Remove local AgePolicy schema and reference shared.json#/components/schemas/AgePolicy
- [x] 2.3 [openrpc] Update src/openrpc/metrics.json - Add entityId and agePolicy to startContent params
- [x] 2.4 [openrpc] Update src/openrpc/metrics.json - Add entityId and agePolicy to stopContent params
- [x] 2.5 [openrpc] Update src/openrpc/metrics.json - Rename pageName to pageId and add agePolicy to page params
- [x] 2.6 [openrpc] Update src/openrpc/metrics.json - Replace error params with new structure (type, code, description, visible, parameters, agePolicy)
- [x] 2.7 [openrpc] Update src/openrpc/metrics.json - Add target to mediaSeeking params
- [x] 2.8 [openrpc] Update src/openrpc/metrics.json - Add position to mediaSeeked params
- [x] 2.9 [openrpc] Update src/openrpc/metrics.json - Add rate to mediaRateChanged params
- [x] 2.10 [openrpc] Update src/openrpc/metrics.json - Add bitrate, width, height, profile to mediaRenditionChanged params
- [x] 2.11 [openrpc] Update src/openrpc/metrics.json - Replace event params with schema and data
- [x] 2.12 [openrpc] Update src/openrpc/metrics.json - Replace appInfo params with build parameter
- [x] 2.13 [openrpc] Update src/openrpc/metrics.json - Replace ErrorType enum values in components/schemas

## 3. Generator Implementation

- [x] 3.1 [generator] Update src/generators/inject-js.ts - Add getParamPattern function to detect single-primitive-wrap pattern
- [x] 3.2 [generator] Update src/generators/inject-js.ts - Add _addMethodWithPrimitiveWrap stub factory function
- [x] 3.3 [generator] Update src/generators/inject-js.ts - Modify emitStaticModules to use single-primitive-wrap pattern when detected
- [x] 3.4 [generator] Update src/generators/inject-js.ts - Update extension schema loading to support primitive-wrap pattern

## 4. Testing

- [x] 4.1 [test] Add unit test for single-primitive-wrap pattern detection in inject-js.test.ts
- [x] 4.2 [test] Add unit test for _addMethodWithPrimitiveWrap function in inject-js.test.ts
- [x] 4.3 [test] Run existing inject-js generator tests to ensure no regressions
- [x] 4.4 [test] Run npm run generate to regenerate all language headers
- [x] 4.5 [test] Verify generated TypeScript headers compile without errors
- [x] 4.6 [test] Verify generated inject-js bundle includes new pattern
- [x] 4.7 [test] Manually verify Metrics.appInfo uses primitive-wrap pattern in generated code

## 5. Verification

- [x] 5.1 [test] Confirm Device.name property exists in device.json (no changes needed)
- [x] 5.2 [test] Confirm VideoOutput.onHdcpChanged event exists in video-output.json (no changes needed)
- [x] 5.3 [test] Validate all OpenRPC schemas with openspec validation if available
- [x] 5.4 [test] Check that all generated language headers reflect the schema changes
