## 1. Accessibility Spec Updates

- [x] 1.1 [spec] Update `openspec/specs/api/accessibility/spec.md` - Fix ClosedCaptionsSettings preferredLanguages description to specify empty array behavior and ISO 639-2/B codes
- [x] 1.2 [spec] Update `openspec/specs/api/accessibility/spec.md` - Update closedCaptionsSettings property description to match specification

## 2. Actions Spec Updates

- [x] 2.1 [spec] Update `openspec/specs/api/actions/spec.md` - Change Actions.start intent parameter type from string to object
- [x] 2.2 [spec] Update `openspec/specs/api/actions/spec.md` - Change Actions.intent property result type from string to object
- [x] 2.3 [spec] Update `openspec/specs/api/actions/spec.md` - Change IntentPayload intent field type from string to object

## 3. Device Spec Updates

- [x] 3.1 [spec] Update `openspec/specs/api/device/spec.md` - Add detailed descriptions for DeviceClass enum values (ott, stb, tv)

## 4. Discovery Spec Updates

- [x] 4.1 [spec] Update `openspec/specs/api/discovery/spec.md` - Fix Discovery.watched progress parameter to specify conditional types (VOD: 0-0.99, live: seconds)
- [x] 4.2 [spec] Update `openspec/specs/api/discovery/spec.md` - Fix Discovery.watched watchedOn parameter to specify ISO 8601 datetime format
- [x] 4.3 [spec] Update `openspec/specs/api/discovery/spec.md` - Fix Discovery.watched agePolicy parameter to specify valid enum values

## 5. Display Spec Updates

- [x] 5.1 [spec] Update `openspec/specs/api/display/spec.md` - Change colorimetry return type to unordered list of enum values (bt709, bt2020)
- [x] 5.2 [spec] Update `openspec/specs/api/display/spec.md` - Update colorimetry description to specify unordered list and empty list behavior
- [x] 5.3 [spec] Update `openspec/specs/api/display/spec.md` - Change videoResolutions return type to unordered list of enum values (720p50, 720p60, 1080p50, 1080p60, 2160p50, 2160p60)
- [x] 5.4 [spec] Update `openspec/specs/api/display/spec.md` - Update videoResolutions description to specify unordered list and empty list behavior

## 6. Localization Spec Updates

- [x] 6.1 [spec] Update `openspec/specs/api/localization/spec.md` - Update presentationLanguage description to clarify format (e.g. en-US)

## 7. Metrics Spec Updates

- [x] 7.1 [spec] Update `openspec/specs/api/metrics/spec.md` - Fix MediaLoadStartParams entityId type to string
- [x] 7.2 [spec] Update `openspec/specs/api/metrics/spec.md` - Fix MediaLoadStartParams agePolicy type to optional string
- [x] 7.3 [spec] Update `openspec/specs/api/metrics/spec.md` - Fix MediaPlayParams entityId type to string
- [x] 7.4 [spec] Update `openspec/specs/api/metrics/spec.md` - Fix MediaPlayParams agePolicy type to optional string
- [x] 7.5 [spec] Update `openspec/specs/api/metrics/spec.md` - Fix MediaPlayingParams entityId type to string
- [x] 7.6 [spec] Update `openspec/specs/api/metrics/spec.md` - Fix MediaPlayingParams agePolicy type to optional string
- [x] 7.7 [spec] Update `openspec/specs/api/metrics/spec.md` - Fix MediaPauseParams entityId type to string
- [x] 7.8 [spec] Update `openspec/specs/api/metrics/spec.md` - Fix MediaPauseParams agePolicy type to optional string
- [x] 7.9 [spec] Update `openspec/specs/api/metrics/spec.md` - Fix MediaWaitingParams entityId type to string
- [x] 7.10 [spec] Update `openspec/specs/api/metrics/spec.md` - Fix MediaWaitingParams agePolicy type to optional string
- [x] 7.11 [spec] Update `openspec/specs/api/metrics/spec.md` - Fix MediaEndedParams entityId type to string
- [x] 7.12 [spec] Update `openspec/specs/api/metrics/spec.md` - Fix MediaEndedParams agePolicy type to optional string

## 8. VideoOutput Spec Updates

- [x] 8.1 [spec] Update `openspec/specs/api/video-output/spec.md` - Update VideoResolution to specify width/height as unsigned with allowed value combinations
- [x] 8.2 [spec] Update `openspec/specs/api/video-output/spec.md` - Update resolution description to specify pixel dimensions and device type behavior
- [x] 8.3 [spec] Update `openspec/specs/api/video-output/spec.md` - Update hdcp description to specify OTT/STB vs TV device behavior
- [x] 8.4 [spec] Update `openspec/specs/api/video-output/spec.md` - Update onHdcpChanged description to specify OTT/STB vs TV device behavior

## 9. Accessibility OpenRPC Updates

- [x] 9.1 [openrpc] Update `src/openrpc/accessibility.json` - Derive from updated accessibility spec to fix ClosedCaptionsSettings types and descriptions

## 10. Actions OpenRPC Updates

- [x] 10.1 [openrpc] Update `src/openrpc/actions.json` - Derive from updated actions spec to fix intent parameter types from string to object

## 11. Device OpenRPC Updates

- [x] 11.1 [openrpc] Update `src/openrpc/device.json` - Derive from updated device spec to add DeviceClass enum descriptions

## 12. Discovery OpenRPC Updates

- [x] 12.1 [openrpc] Update `src/openrpc/discovery.json` - Derive from updated discovery spec to fix watched parameter types and descriptions

## 13. Display OpenRPC Updates

- [x] 13.1 [openrpc] Update `src/openrpc/display.json` - Derive from updated display spec to fix colorimetry and videoResolutions types and descriptions

## 14. Localization OpenRPC Updates

- [x] 14.1 [openrpc] Update `src/openrpc/localization.json` - Derive from updated localization spec to fix presentationLanguage description

## 15. Metrics OpenRPC Updates

- [x] 15.1 [openrpc] Update `src/openrpc/metrics.json` - Derive from updated metrics spec to fix all Media*Params types

## 16. VideoOutput OpenRPC Updates

- [x] 16.1 [openrpc] Update `src/openrpc/video-output.json` - Derive from updated video-output spec to fix resolution types and hdcp descriptions

## 17. AST Verification

- [x] 17.1 [ast] Verify AST builder creates correct node types for all updated modules (ObjectTypeDecl for intent, proper enum types, etc.)

## 18. Generator Verification

- [x] 18.1 [generator] Verify TypeScript generator emits correct type declarations for all updated modules
- [x] 18.2 [generator] Verify Kotlin generator emits correct type declarations for all updated modules
- [x] 18.3 [generator] Verify C++ generator emits correct type declarations for all updated modules
- [x] 18.4 [generator] Verify Python generator emits correct type declarations for all updated modules
- [x] 18.5 [generator] Verify ReScript generator emits correct type declarations for all updated modules

## 19. Testing

- [x] 19.1 [test] Run `npm run generate` to verify all generators produce valid output
- [x] 19.2 [test] Run `npm test` to verify no regressions in existing tests
- [x] 19.3 [test] Verify generated TypeScript declaration files type-check correctly
- [x] 19.4 [test] Verify generated code compiles for each language target

## 20. Generator Bug Fix Required

- [x] 20.1 [generator] Investigate TypeScript generator parameter handling to understand why nested object parameters generate as `params: string`
- [x] 20.2 [generator] Fix AST builder to create synthetic TypeDecls for inline anonymous object parameters (Rule 6 for parameters)
- [x] 20.3 [generator] Regenerate code to verify the fix works correctly
- [x] 20.4 [test] Run tests to ensure generator fix doesn't break existing functionality

## 21. Generic Object Type Handling

- [x] 21.1 [ast] Add GenericObjectRef type to AST types for generic JSON objects without specific structure
- [x] 21.2 [ast] Update AST builder to handle generic objects (type: object without properties) using GenericObjectRef in resolveTypeRef
- [x] 21.3 [generator] Update TypeScript generator to emit Record<string, unknown> for GenericObjectRef
- [x] 21.4 [generator] Update ReScript generator to emit Js.t<{}, Js.Json.t> for GenericObjectRef
- [x] 21.5 [generator] Update Kotlin generator to emit dynamic for GenericObjectRef
- [x] 21.6 [generator] Update Python generator to emit dict[str, Any] for GenericObjectRef
- [x] 21.7 [generator] Update C++ generator to emit nlohmann::json for GenericObjectRef
- [x] 21.8 [generator] Update inject-js-types generator to emit Record<string, unknown> for GenericObjectRef
- [x] 21.9 [generator] Regenerate code to verify generic object handling works correctly
- [x] 21.10 [test] Run tests to ensure generic object handling doesn't break existing functionality