## Why

The firebolt-builder.js implementation from the feat/fireboltweb branch contains several API methods that are missing from the current OpenSpec definitions. These missing APIs need to be added to the specs so that the AST and OpenRPC can be generated for them, ensuring the inject-js generator can produce the complete set of methods available in the reference implementation.

Additionally, several Metrics methods currently have individual parameters but should be bundled into single object parameters to reduce cyclomatic complexity, matching the pattern used in firebolt-builder.js.

## What Changes

### Device Module - Add Missing APIs
- **uptime**: Returns device uptime in seconds
- **brandName**: Returns device brand name
- **modelId**: Returns device model identifier
- **osName**: Returns operating system name
- **osVersion**: Returns operating system version
- **firmware**: Returns firmware version string
- **name**: Returns device friendly name
- **onNameChanged**: Event for when device name changes

### Metrics Module - Add Missing APIs and Bundle Parameters
- **signIn**: Log sign-in event (no params, platform auto-detects id)
- **signOut**: Log sign-out event (no params, platform auto-detects id)
- **Parameter Bundling**: Bundle individual parameters into single object parameters for:
  - mediaLoadStart, mediaPlay, mediaPause, mediaWaiting
  - mediaSeeking, mediaSeeked, mediaRateChanged, mediaRenditionChanged, mediaEnded

### Localization Module - Add Missing APIs
- **timeZone**: Returns IANA time zone format
- **onTimeZoneChanged**: Event for when time zone changes

### VideoOutput Module - Add Missing APIs
- **hdcp**: Returns current HDCP state (enum: hdcp1.4, hdcp2.2, none, direct)
- **onHdcpChanged**: Event for when HDCP state changes

**Backward Compatibility**: These are additive changes only. No existing APIs are modified or removed.

## Capabilities

### New Capabilities
- **Device Module**: Enhanced device information access (uptime, brand, model, OS details, firmware, friendly name)
- **Metrics Module**: User authentication tracking (signIn, signOut)
- **Localization Module**: Time zone information access
- **VideoOutput Module**: HDCP output protection state monitoring

### Modified Capabilities
- **Metrics Module**: Update media method parameter structures to use object bundling for reduced complexity

## Impact

- **Spec code**: 
  - `openspec/specs/api/device/spec.md` - add 7 new methods/events
  - `openspec/specs/api/metrics/spec.md` - add 2 new methods, update 9 existing methods
  - `openspec/specs/api/localization/spec.md` - add 1 new property and 1 event
  - `openspec/specs/api/video-output/spec.md` - add 1 new property and 1 event
- **OpenRPC code**:
  - `src/openrpc/device.json` - add OpenRPC definitions for new Device methods
  - `src/openrpc/metrics.json` - update OpenRPC definitions for Metrics methods
  - `src/openrpc/localization.json` - add OpenRPC definitions for new Localization methods
  - `src/openrpc/video-output.json` - add OpenRPC definitions for new VideoOutput methods
- **AST code**: No direct changes - AST will be regenerated from updated OpenRPC
- **Generator code**: No changes - generators will process updated AST
- **Test code**: Tests will be updated to cover new APIs
- **User code**: Additive only - existing code continues to work, new APIs become available
- **Dependencies**: No new dependencies required

## Pipeline Impact

- **Spec Layer**: Add new API definitions to module specs
- **OpenRPC Layer**: Update OpenRPC JSON files with new method definitions
- **AST Layer**: No direct changes - AST will be regenerated from updated OpenRPC
- **Generator Layer**: No changes - generators will process updated AST automatically
- **Test Layer**: Update tests to cover new APIs

## Target Languages

All language generators (TypeScript, ReScript, Kotlin/JS, C++, Python) will automatically include the new APIs once the AST is updated.

## Firebolt 9 Modules in Scope

- **Device**: Add 7 new methods/events
- **Metrics**: Add 2 new methods, update 9 existing methods
- **Localization**: Add 1 new property and 1 event
- **VideoOutput**: Add 1 new property and 1 event

## References

- Reference implementation: `webkitExtension/resources/firebolt-builder.js` (feat/fireboltweb branch)
- Current Device spec: `openspec/specs/api/device/spec.md`
- Current Metrics spec: `openspec/specs/api/metrics/spec.md`
- Current Localization spec: `openspec/specs/api/localization/spec.md`
- Current VideoOutput spec: `openspec/specs/api/video-output/spec.md`
