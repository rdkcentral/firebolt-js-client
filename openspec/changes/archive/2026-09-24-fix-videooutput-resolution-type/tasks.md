## 1. Specification Updates

- [x] 1.1 [spec] Update `openspec/specs/api/video-output/spec.md` - Change VideoResolution type from string to object with width and height properties
- [x] 1.2 [spec] Update `openspec/specs/api/video-output/spec.md` - Add onResolutionChanged event entry with VideoResolution result type
- [x] 1.3 [spec] Update `openspec/specs/api/video-output/spec.md` - Update examples to use object format `{ width: 3840, height: 2160 }` instead of string format

## 2. OpenRPC Schema Updates

- [x] 2.1 [openrpc] Update `src/openrpc/video-output.json` - Change VideoResolution schema from `type: "string"` to object with width/height properties
- [x] 2.2 [openrpc] Update `src/openrpc/video-output.json` - Add onResolutionChanged method with VideoResolution result type
- [x] 2.3 [openrpc] Update `src/openrpc/video-output.json` - Update examples to use object format for VideoResolution

## 3. AST Verification

- [x] 3.1 [ast] Verify AST builder creates ObjectTypeDecl for VideoResolution instead of ScalarAliasDecl after OpenRPC changes

## 4. Generator Verification

- [x] 4.1 [generator] Verify TypeScript generator emits proper VideoResolution interface with width/height fields
- [x] 4.2 [generator] Verify Kotlin generator emits proper VideoResolution object with width/height fields
- [x] 4.3 [generator] Verify C++ generator emits proper VideoResolution struct with width/height fields
- [x] 4.4 [generator] Verify Python generator emits proper VideoResolution class with width/height fields
- [x] 4.5 [generator] Verify ReScript generator emits proper VideoResolution type with width/height fields

## 5. Testing

- [x] 5.1 [test] Run `npm run generate` to verify all generators produce valid output
- [x] 5.2 [test] Run `npm test` to verify no regressions in existing tests
- [x] 5.3 [test] Verify generated TypeScript declaration files type-check correctly
