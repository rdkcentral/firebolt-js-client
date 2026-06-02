## ADDED Requirements

### Requirement: VideoOutput module exposes resolution getter and event
The VideoOutput module spec SHALL be created with `platform: both` and SHALL declare `resolution` as a `properties` entry with result type `VideoResolution` (an object with `width: unsigned` and `height: unsigned`). Valid values are: 720×480, 720×576, 1280×720, 1920×1080, 3840×2160. The derived OpenRPC SHALL contain both `VideoOutput.resolution` (call) and `VideoOutput.onResolutionChanged` (subscribe). Introduced in API version 9.0.0.

#### Scenario: VideoOutput.resolution getter is in the method registry
- **WHEN** the inject-js bundle is generated from the VideoOutput OpenRPC
- **THEN** `_methodRegistry["VideoOutput.resolution"]` MUST exist with `kind: "call"`
- **THEN** `_typeSchemas["VideoOutput.VideoResolution"]` MUST be an object with `width` and `height` as unsigned fields

#### Scenario: VideoOutput.onResolutionChanged subscription is in the method registry
- **WHEN** the inject-js bundle is generated
- **THEN** `_methodRegistry["VideoOutput.onResolutionChanged"]` MUST exist with `kind: "subscribe"`
- **THEN** `resultSchema` MUST reference the same `VideoResolution` type as the getter
