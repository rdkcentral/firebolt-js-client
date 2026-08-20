## ADDED Requirements

### Requirement: Display module exposes colorimetry capabilities (JS-only)
The Display module spec SHALL be created with `platform: web` (C++ does not support these methods). It SHALL declare `colorimetry` as an `actions` entry returning a `list of ColorimetryValue` enum. `ColorimetryValue` SHALL have values `"bt709"` and `"bt2020"`. Returns an empty list if no TV is attached. Introduced in API version 9.0.0.

#### Scenario: Display.colorimetry is in the method registry
- **WHEN** the inject-js bundle is generated from the Display OpenRPC
- **THEN** `_methodRegistry["Display.colorimetry"]` MUST exist with `kind: "call"`
- **THEN** `resultSchema` MUST be an array whose items reference the `ColorimetryValue` enum

#### Scenario: Display module is excluded from native generators
- **WHEN** the C++ or Python generator processes the CanonicalAST
- **THEN** no `Display` module headers MUST be emitted (platform is `web` — native generators skip it)

---

### Requirement: Display module exposes video resolution capabilities (JS-only)
The Display module spec SHALL declare `videoResolutions` as an `actions` entry returning a `list of VideoResolution` enum. `VideoResolution` SHALL have values `"720p50"`, `"720p60"`, `"1080p50"`, `"1080p60"`, `"2160p50"`, `"2160p60"`. Returns an empty list if no TV is attached. Introduced in API version 9.0.0.

#### Scenario: Display.videoResolutions is in the method registry
- **WHEN** the inject-js bundle is generated
- **THEN** `_methodRegistry["Display.videoResolutions"]` MUST exist with `kind: "call"`
- **THEN** `resultSchema` MUST be an array whose items reference the `VideoResolution` enum
- **THEN** `_typeSchemas["Display.VideoResolution"]` MUST contain values `["720p50","720p60","1080p50","1080p60","2160p50","2160p60"]`
