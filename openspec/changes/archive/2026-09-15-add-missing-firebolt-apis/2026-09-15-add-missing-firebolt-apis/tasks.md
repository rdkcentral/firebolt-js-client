## 1. Device Spec Updates

- [x] 1.1 [spec] Add uptime action/property to openspec/specs/api/device/spec.md
- [x] 1.2 [spec] Add brandName action/property to openspec/specs/api/device/spec.md
- [x] 1.3 [spec] Add modelId action/property to openspec/specs/api/device/spec.md
- [x] 1.4 [spec] Add osName action/property to openspec/specs/api/device/spec.md
- [x] 1.5 [spec] Add osVersion action/property to openspec/specs/api/device/spec.md
- [x] 1.6 [spec] Add firmware action/property to openspec/specs/api/device/spec.md
- [x] 1.7 [spec] Add name property to openspec/specs/api/device/spec.md
- [x] 1.8 [spec] Add onNameChanged event to openspec/specs/api/device/spec.md

## 2. Metrics Spec Updates

- [x] 2.1 [spec] Add signIn action to openspec/specs/api/metrics/spec.md
- [x] 2.2 [spec] Add signOut action to openspec/specs/api/metrics/spec.md
- [x] 2.3 [spec] Update mediaLoadStart to use object parameter in openspec/specs/api/metrics/spec.md
- [x] 2.4 [spec] Update mediaPlay to use object parameter in openspec/specs/api/metrics/spec.md
- [x] 2.5 [spec] Update mediaPause to use object parameter in openspec/specs/api/metrics/spec.md
- [x] 2.6 [spec] Update mediaWaiting to use object parameter in openspec/specs/api/metrics/spec.md
- [x] 2.7 [spec] Update mediaSeeking to use object parameter in openspec/specs/api/metrics/spec.md
- [x] 2.8 [spec] Update mediaSeeked to use object parameter in openspec/specs/api/metrics/spec.md
- [x] 2.9 [spec] Update mediaRateChanged to use object parameter in openspec/specs/api/metrics/spec.md
- [x] 2.10 [spec] Update mediaRenditionChanged to use object parameter in openspec/specs/api/metrics/spec.md
- [x] 2.11 [spec] Update mediaEnded to use object parameter in openspec/specs/api/metrics/spec.md

## 3. Localization Spec Updates

- [x] 3.1 [spec] Add timeZone property to openspec/specs/api/localization/spec.md
- [x] 3.2 [spec] Add onTimeZoneChanged event to openspec/specs/api/localization/spec.md

## 4. VideoOutput Spec Updates

- [x] 4.1 [spec] Add hdcp property to openspec/specs/api/video-output/spec.md
- [x] 4.2 [spec] Add onHdcpChanged event to openspec/specs/api/video-output/spec.md
- [x] 4.3 [spec] Add HdcpType enum definition to openspec/specs/api/video-output/spec.md

## 5. OpenRPC File Updates

- [x] 5.1 [openrpc] Add uptime method to src/openrpc/device.json
- [x] 5.2 [openrpc] Add brandName method to src/openrpc/device.json
- [x] 5.3 [openrpc] Add modelId method to src/openrpc/device.json
- [x] 5.4 [openrpc] Add osName method to src/openrpc/device.json
- [x] 5.5 [openrpc] Add osVersion method to src/openrpc/device.json
- [x] 5.6 [openrpc] Add firmware method to src/openrpc/device.json
- [x] 5.7 [openrpc] Add name property to src/openrpc/device.json
- [x] 5.8 [openrpc] Add onNameChanged event to src/openrpc/device.json
- [x] 5.9 [openrpc] Add signIn method to src/openrpc/metrics.json
- [x] 5.10 [openrpc] Add signOut method to src/openrpc/metrics.json
- [x] 5.11 [openrpc] Update mediaLoadStart parameters to object in src/openrpc/metrics.json
- [x] 5.12 [openrpc] Update mediaPlay parameters to object in src/openrpc/metrics.json
- [x] 5.13 [openrpc] Update mediaPause parameters to object in src/openrpc/metrics.json
- [x] 5.14 [openrpc] Update mediaWaiting parameters to object in src/openrpc/metrics.json
- [x] 5.15 [openrpc] Update mediaSeeking parameters to object in src/openrpc/metrics.json
- [x] 5.16 [openrpc] Update mediaSeeked parameters to object in src/openrpc/metrics.json
- [x] 5.17 [openrpc] Update mediaRateChanged parameters to object in src/openrpc/metrics.json
- [x] 5.18 [openrpc] Update mediaRenditionChanged to object in src/openrpc/metrics.json
- [x] 5.19 [openrpc] Update mediaEnded to use object parameter in src/openrpc/metrics.json
- [x] 5.20 [openrpc] Add timeZone property to src/openrpc/localization.json
- [x] 5.21 [openrpc] Add onTimeZoneChanged event to src/openrpc/localization.json
- [x] 5.22 [openrpc] Add hdcp property to src/openrpc/video-output.json
- [x] 5.23 [openrpc] Add onHdcpChanged event to src/openrpc/video-output.json
- [x] 5.24 [openrpc] Add HdcpType enum to src/openrpc/video-output.json

## 6. AST Regeneration

- [ ] 6.1 [ast] Run AST builder to regenerate Canonical AST from updated OpenRPC files
- [ ] 6.2 [ast] Verify new Device methods appear in AST
- [ ] 6.3 [ast] Verify new Metrics methods appear in AST
- [ ] 6.4 [ast] Verify new Localization methods appear in AST
- [ ] 6.5 [ast] Verify new VideoOutput methods appear in AST
- [ ] 6.6 [ast] Verify parameter bundling is correctly represented in AST

## 7. Test Updates

- [ ] 7.1 [test] Add tests for new Device methods (uptime, brandName, modelId, osName, osVersion, firmware, name)
- [ ] 7.2 [test] Add test for Device.onNameChanged event
- [ ] 7.3 [test] Add tests for new Metrics methods (signIn, signOut)
- [ ] 7.4 [test] Add tests for Metrics parameter bundling
- [ ] 7.5 [test] Add test for Localization.timeZone property
- [ ] 7.6 [test] Add test for Localization.onTimeZoneChanged event
- [ ] 7.7 [test] Add test for VideoOutput.hdcp property
- [ ] 7.8 [test] Add test for VideoOutput.onHdcpChanged event
- [ ] 7.9 [test] Verify HdcpType enum is correctly handled
- [ ] 7.10 [test] Run full test suite to ensure no regressions

## 8. Verification

- [ ] 8.1 [spec] Verify all new specs follow OpenSpec format
- [ ] 8.2 [openrpc] Verify OpenRPC JSON files are valid
- [ ] 8.3 [ast] Verify AST includes all new methods
- [ ] 8.4 [generator] Verify all generators produce correct output for new methods
- [ ] 8.5 [test] Verify all tests pass
- [ ] 8.6 [generator] Run inject-js generator to verify new methods appear in output
