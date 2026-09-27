## Design Overview

This change adds missing API definitions to the OpenSpec specs for Device, Metrics, Localization, and VideoOutput modules to match the firebolt-builder.js reference implementation. The change is purely additive - no existing APIs are modified or removed.

## Architecture

### Current State
```
┌─────────────────────────────────────────────────────────┐
│              Current OpenSpec Coverage                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Device: uid, deviceClass, hdr, dolbyAtmosExperience  │
│  Metrics: ready, startContent, stopContent, page, error │
│           mediaLoadStart (individual params), ...       │
│  Localization: country, preferredAudioLanguages,       │
│                 presentationLanguage                    │
│  VideoOutput: resolution                                │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Target State
```
┌─────────────────────────────────────────────────────────┐
│              Updated OpenSpec Coverage                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Device: uid, deviceClass, hdr, dolbyAtmosExperience  │
│          + uptime, brandName, modelId, osName,         │
│            osVersion, firmware, name, onNameChanged     │
│  Metrics: ready, startContent, stopContent, page, error │
│           + signIn, signOut                              │
│           mediaLoadStart (bundled params), ...           │
│  Localization: country, preferredAudioLanguages,         │
│                 presentationLanguage                     │
│                 + timeZone, onTimeZoneChanged           │
│  VideoOutput: resolution                                │
│              + hdcp, onHdcpChanged                      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## API Details

### Device Module Additions

#### uptime
- **Type**: Action/Property
- **Parameters**: none
- **Returns**: number
- **Description**: Returns the number of seconds since most recent device boot, including any time spent during deep sleep
- **Since**: 9.0.0

#### brandName
- **Type**: Action/Property
- **Parameters**: none
- **Returns**: string
- **Description**: Returns the brand name under which the device was marketed to consumers. Typically also shown on the TV bezel, device label or remote either "" (if not initialized) 1 or more characters
- **Since**: 9.0.0

#### modelId
- **Type**: Action/Property
- **Parameters**: none
- **Returns**: string
- **Description**: Returns the model identifier assigned to the device hardware. Typically also shown on the device label or UI
- **Since**: 9.0.0

#### osName
- **Type**: Action/Property
- **Parameters**: none
- **Returns**: string
- **Description**: Returns the operating system name as defined by the operator
- **Since**: 9.0.0

#### osVersion
- **Type**: Action/Property
- **Parameters**: none
- **Returns**: string
- **Description**: Returns the operating system version as defined by the operator
- **Since**: 9.0.0

#### firmware
- **Type**: Action/Property
- **Parameters**: none
- **Returns**: string
- **Description**: Returns a string that identifies the firmware image of the device
- **Since**: 9.0.0

#### name
- **Type**: Property
- **Parameters**: none
- **Returns**: string
- **Description**: Returns the device friendly name. Used by network services (DIAL, Miracast, AirPlay) so that other devices can more easily identify this device during device discovery
- **Since**: 9.0.0

#### onNameChanged
- **Type**: Event
- **Description**: Event for when Device.name changed
- **Since**: 9.0.0

### Metrics Module Additions

#### signIn
- **Type**: Action
- **Parameters**: none
- **Returns**: null
- **Description**: Log a sign in event. Platform will automatically detect the id
- **Since**: 9.0.0

#### signOut
- **Type**: Action
- **Parameters**: none
- **Returns**: null
- **Description**: Log a sign out event. Platform will automatically detect the id
- **Since**: 9.0.0

#### Parameter Bundling
The following methods will be updated to use single object parameters instead of individual parameters:
- mediaLoadStart, mediaPlay, mediaPause, mediaWaiting
- mediaSeeking, mediaSeeked, mediaRateChanged, mediaRenditionChanged, mediaEnded

**Example transformation:**
```yaml
# Current
mediaPlay:
  params:
    - name: mediaId
      type: string
      required: true
    - name: position
      type: number
      required: false

# Updated
mediaPlay:
  params:
    - name: params
      type: object
      required: true
      properties:
        mediaId:
          type: string
        position:
          type: number
```

### Localization Module Additions

#### timeZone
- **Type**: Property
- **Parameters**: none
- **Returns**: string
- **Description**: Returns the IANA time zone format (e.g., "America/New_York", "Europe/London")
- **Since**: 9.0.0

#### onTimeZoneChanged
- **Type**: Event
- **Description**: Event for when Localization.timeZone changed
- **Since**: 9.0.0

### VideoOutput Module Additions

#### hdcp
- **Type**: Property
- **Parameters**: none
- **Returns**: enum (HdcpType)
- **Description**: Returns the current state of output protection on the video output
  - OTT/STB device: returns the negotiated HDCP version on the video output, or none if an encrypted connection has not been made between the OTT/STB device and any attached TV
  - TV device: returns direct
- **Since**: 9.0.0

#### onHdcpChanged
- **Type**: Event
- **Description**: Event for when VideoOutput.hdcp changed
- **Since**: 9.0.0

#### HdcpType Enum
```yaml
HdcpType:
  kind: enum
  description: HDCP output protection state
  values:
    - id: "hdcp1.4"
      description: HDCP 1.4 negotiated
    - id: "hdcp2.2"
      description: HDCP 2.2 negotiated
    - id: "none"
      description: No encrypted connection established
    - id: "direct"
      description: Direct connection (TV device)
```

## Implementation Steps

### 1. Update Device Spec
1. Add uptime action/property to `openspec/specs/api/device/spec.md`
2. Add brandName action/property to `openspec/specs/api/device/spec.md`
3. Add modelId action/property to `openspec/specs/api/device/spec.md`
4. Add osName action/property to `openspec/specs/api/device/spec.md`
5. Add osVersion action/property to `openspec/specs/api/device/spec.md`
6. Add firmware action/property to `openspec/specs/api/device/spec.md`
7. Add name property to `openspec/specs/api/device/spec.md`
8. Add onNameChanged event to `openspec/specs/api/device/spec.md`

### 2. Update Metrics Spec
1. Add signIn action to `openspec/specs/api/metrics/spec.md`
2. Add signOut action to `openspec/specs/api/metrics/spec.md`
3. Update mediaLoadStart to use object parameter
4. Update mediaPlay to use object parameter
5. Update mediaPause to use object parameter
6. Update mediaWaiting to use object parameter
7. Update mediaSeeking to use object parameter
8. Update mediaSeeked to use object parameter
9. Update mediaRateChanged to use object parameter
10. Update mediaRenditionChanged to use object parameter
11. Update mediaEnded to use object parameter

### 3. Update Localization Spec
1. Add timeZone property to `openspec/specs/api/localization/spec.md`
2. Add onTimeZoneChanged event to `openspec/specs/api/localization/spec.md`

### 4. Update VideoOutput Spec
1. Add hdcp property to `openspec/specs/api/video-output/spec.md`
2. Add onHdcpChanged event to `openspec/specs/api/video-output/spec.md`
3. Add HdcpType enum definition to `openspec/specs/api/video-output/spec.md`

### 5. Update OpenRPC Files
1. Update `src/openrpc/device.json` with new Device methods
2. Update `src/openrpc/metrics.json` with new Metrics methods and parameter bundling
3. Update `src/openrpc/localization.json` with new Localization methods
4. Update `src/openrpc/video-output.json` with new VideoOutput methods

### 6. Regenerate AST
1. Run AST builder to regenerate Canonical AST from updated OpenRPC
2. Verify new methods appear in AST

### 7. Update Tests
1. Add tests for new Device methods
2. Add tests for new Metrics methods
3. Add tests for new Localization methods
4. Add tests for new VideoOutput methods
5. Verify parameter bundling works correctly in Metrics

## Testing Strategy

### Spec Validation
- Verify all new specs follow OpenSpec format
- Verify parameter types and descriptions are accurate
- Verify enum definitions are correct

### OpenRPC Validation
- Verify OpenRPC JSON files are valid
- Verify method signatures match specs
- Verify parameter structures are correct

### AST Validation
- Verify AST includes all new methods
- Verify method types are correct (action/property/event)
- Verify parameter structures match OpenRPC

### Generator Validation
- Verify all generators produce correct output for new methods
- Verify parameter bundling produces correct signatures
- Verify enum types are handled correctly

## Migration Path

This is a purely additive change. No migration is required for existing code. New APIs will be available to consumers once the generators are run.

## Performance Considerations

- No performance impact - additive changes only
- Parameter bundling may slightly improve code generation efficiency
- No runtime performance changes

## Security Considerations

- Device information APIs (brandName, modelId, etc.) provide device identification
- No new security concerns - these are read-only information APIs
- Existing security model remains unchanged
