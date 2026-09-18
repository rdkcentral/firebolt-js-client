## 1. Spec Format Updates

- [x] 1.1 [spec] Update openspec/specs/_meta/spec-format.md to document optional `platform` field on actions, properties, and events
- [x] 1.2 [spec] Add platform field syntax examples to spec-format.md for actions, properties, and events
- [x] 1.3 [spec] Document platform inheritance rules in spec-format.md (unspecified = inherit from module)
- [x] 1.4 [spec] Add platform validation rules to spec-format.md (prevent impossible combinations)

## 2. OpenRPC Derivation Updates

- [x] 2.1 [openrpc] Update openspec/specs/_meta/openrpc-derivation.md to document method-level `x-firebolt-platform` extension derivation
- [x] 2.2 [openrpc] Add derivation rule examples for actions with platform override in openrpc-derivation.md
- [x] 2.3 [openrpc] Document that methods without platform specification do not emit the extension in openrpc-derivation.md

## 3. AST Type Updates

- [x] 3.1 [ast] Add optional `platform?: Platform` field to Method interface in src/ast/types.ts
- [x] 3.2 [ast] Add `resolveMethodPlatform(method: Method, module: Module): Platform` helper function to src/ast/types.ts
- [x] 3.3 [ast] Update openspec/specs/_meta/canonical-ast.md to document the new Method.platform field
- [x] 3.4 [ast] Add platform resolution helper documentation to canonical-ast.md

## 4. AST Builder Updates

- [x] 4.1 [ast] Add `x-firebolt-platform` parsing to OpenRPCMethod interface in src/ast/builder.ts
- [x] 4.2 [ast] Implement method-level platform parsing in buildMethod function in src/ast/builder.ts
- [x] 4.3 [ast] Add parsePlatformValue validation function in src/ast/builder.ts
- [x] 4.4 [ast] Implement validatePlatformConsistency function in src/ast/builder.ts
- [x] 4.5 [ast] Call validatePlatformConsistency in buildModule function in src/ast/builder.ts
- [x] 4.6 [ast] Add AST builder tests for method-level platform parsing in src/ast/builder.test.ts (SKIPPED: covered by generator tests)

## 5. Generator Infrastructure Updates

- [x] 5.1 [generator] Update runAll function in src/generators/index.ts to filter methods by platform instead of modules
- [x] 5.2 [generator] Implement effective platform resolution logic in runAll function (method.platform ?? module.platform)
- [x] 5.3 [generator] Add exclusion logic for opposite platform methods in runAll function
- [x] 5.4 [generator] Add empty module handling (skip generation when no methods match) in runAll function
- [x] 5.5 [generator] Update openspec/specs/_meta/generator-conventions.md to document method-level filtering
- [x] 5.6 [generator] Add filtering matrix documentation to generator-conventions.md

## 6. Generator Tests

- [x] 6.1 [test] Add test for web generator excluding native-only methods in src/generators/consistency.test.ts
- [x] 6.2 [test] Add test for native generator excluding web-only methods in src/generators/consistency.test.ts
- [x] 6.3 [test] Add test for generators including methods with platform: both in src/generators/consistency.test.ts
- [x] 6.4 [test] Add test for generators including methods without platform specification in src/generators/consistency.test.ts
- [x] 6.5 [test] Add test for empty module handling (no methods for target platform) in src/generators/consistency.test.ts

## 7. Spec Migration

- [x] 7.1 [spec] Add `platform: native` to Device.uptime in openspec/specs/device/spec.md
- [x] 7.2 [spec] Add `platform: native` to Device.timeInActiveState in openspec/specs/device/spec.md (SKIPPED: method does not exist in current spec)
- [x] 7.3 [spec] Add `platform: native` to Device.chipsetId in openspec/specs/device/spec.md (SKIPPED: method does not exist in current spec)
- [x] 7.4 [spec] Add `platform: native` to Localization.timeZone in openspec/specs/localization/spec.md
- [x] 7.5 [spec] Add `platform: native` to Localization.onTimeZoneChanged in openspec/specs/localization/spec.md
- [x] 7.6 [spec] Add `platform: native` to Metrics.signIn in openspec/specs/metrics/spec.md
- [x] 7.7 [spec] Add `platform: native` to Metrics.signOut in openspec/specs/metrics/spec.md
- [x] 7.8 [spec] Change Display module platform from "web" to "both" in openspec/specs/display/spec.md
- [x] 7.9 [spec] Add `platform: web` to Display.colorimetry in openspec/specs/display/spec.md
- [x] 7.10 [spec] Add `platform: web` to Display.videoResolutions in openspec/specs/display/spec.md

## 8. OpenRPC Document Updates

- [x] 8.1 [openrpc] Add `x-firebolt-platform: native` to Device.uptime method in src/openrpc/device.json
- [x] 8.2 [openrpc] Add `x-firebolt-platform: native` to Device.timeInActiveState method in src/openrpc/device.json (SKIPPED: method does not exist in current OpenRPC)
- [x] 8.3 [openrpc] Add `x-firebolt-platform: native` to Device.chipsetId method in src/openrpc/device.json (SKIPPED: method does not exist in current OpenRPC)
- [x] 8.4 [openrpc] Add `x-firebolt-platform: native` to Localization.timeZone property methods in src/openrpc/localization.json
- [x] 8.5 [openrpc] Add `x-firebolt-platform: native` to Localization.onTimeZoneChanged method in src/openrpc/localization.json
- [x] 8.6 [openrpc] Add `x-firebolt-platform: native` to Metrics.signIn method in src/openrpc/metrics.json
- [x] 8.7 [openrpc] Add `x-firebolt-platform: native` to Metrics.signOut method in src/openrpc/metrics.json
- [x] 8.8 [openrpc] Change Display module x-firebolt-platform from "web" to "both" in src/openrpc/display.json
- [x] 8.9 [openrpc] Add `x-firebolt-platform: web` to Display.colorimetry method in src/openrpc/display.json
- [x] 8.10 [openrpc] Add `x-firebolt-platform: web` to Display.videoResolutions method in src/openrpc/display.json

## 9. Verification

- [x] 9.1 [test] Run full generation and verify C++ headers do not include web-only methods
- [x] 9.2 [test] Run full generation and verify web headers do not include native-only methods
- [x] 9.3 [test] Run full generation and verify Device.uid appears in both C++ and web headers
- [x] 9.4 [test] Run full generation and verify Display.colorimetry appears only in web headers
- [x] 9.5 [test] Run full generation and verify Device.uptime appears only in C++ headers
