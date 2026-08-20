## ADDED Requirements

### Requirement: Device module exposes persistent app+device UUID
The Device module spec SHALL be created with `platform: both` and SHALL declare an `actions` entry named `uid` that takes no parameters and returns a `string` UUID. Introduced in API version 8.0.0.

#### Scenario: Device.uid is in the method registry
- **WHEN** the inject-js bundle is generated from the Device OpenRPC
- **THEN** `_methodRegistry["Device.uid"]` MUST exist with `kind: "call"`
- **THEN** `resultSchema` MUST be a string primitive

---

### Requirement: Device module exposes device class
The Device module spec SHALL declare `deviceClass` as an `actions` entry returning a `DeviceClass` enum with values `"ott"`, `"stb"`, and `"tv"`. Introduced in API version 9.0.0.

#### Scenario: Device.deviceClass is in the method registry
- **WHEN** the inject-js bundle is generated
- **THEN** `_methodRegistry["Device.deviceClass"]` MUST exist with `kind: "call"`
- **THEN** `_typeSchemas["Device.DeviceClass"]` MUST be an enum with values `["ott", "stb", "tv"]`

---

### Requirement: Device module exposes HDR capability getter and event
The Device module spec SHALL declare `hdr` as a `properties` entry with result type `HdrCapabilities` (an object with `hdr10: bool`, `hdr10Plus: bool`, `dolbyVision: bool`, `hlg: bool`). The derived OpenRPC SHALL contain both `Device.hdr` (call) and `Device.onHdrChanged` (subscribe). Introduced in API version 8.0.0.

#### Scenario: Device.hdr getter is in method registry
- **WHEN** the inject-js bundle is generated
- **THEN** `_methodRegistry["Device.hdr"]` MUST exist with `kind: "call"`
- **THEN** `_typeSchemas["Device.HdrCapabilities"]` MUST be an object with `hdr10`, `hdr10Plus`, `dolbyVision`, and `hlg` as bool fields

#### Scenario: Device.onHdrChanged subscription is in method registry
- **WHEN** the inject-js bundle is generated
- **THEN** `_methodRegistry["Device.onHdrChanged"]` MUST exist with `kind: "subscribe"`
- **THEN** `resultSchema` MUST reference the same `HdrCapabilities` type as the getter

---

### Requirement: Device module exposes Dolby Atmos experience availability getter and event
The Device module spec SHALL declare `dolbyAtmosExperienceAvailable` as a `properties` entry with result type `bool`. The derived OpenRPC SHALL contain both `Device.dolbyAtmosExperienceAvailable` (call) and `Device.onDolbyAtmosExperienceAvailableChanged` (subscribe). Introduced in API version 9.0.0.

#### Scenario: Device.dolbyAtmosExperienceAvailable getter is in method registry
- **WHEN** the inject-js bundle is generated
- **THEN** `_methodRegistry["Device.dolbyAtmosExperienceAvailable"]` MUST exist with `kind: "call"`
- **THEN** `resultSchema` MUST be primitive `bool`

#### Scenario: Device.onDolbyAtmosExperienceAvailableChanged subscription is in method registry
- **WHEN** the inject-js bundle is generated
- **THEN** `_methodRegistry["Device.onDolbyAtmosExperienceAvailableChanged"]` MUST exist with `kind: "subscribe"`
