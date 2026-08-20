## ADDED Requirements

### Requirement: Accessibility.audioDescription exposes audio description setting
The Accessibility module spec SHALL declare `audioDescription` as a property with result type `bool`, and the derived OpenRPC SHALL contain both `Accessibility.audioDescription` (call) and `Accessibility.onAudioDescriptionChanged` (subscribe), both returning `bool`. Introduced in API version 8.0.0.

#### Scenario: audioDescription getter is in method registry
- **WHEN** the inject-js bundle is generated from the Accessibility OpenRPC
- **THEN** `_methodRegistry["Accessibility.audioDescription"]` MUST exist with `kind: "call"`
- **THEN** `resultSchema` MUST resolve to primitive `bool`

#### Scenario: onAudioDescriptionChanged subscription is in method registry
- **WHEN** the inject-js bundle is generated from the Accessibility OpenRPC
- **THEN** `_methodRegistry["Accessibility.onAudioDescriptionChanged"]` MUST exist with `kind: "subscribe"`
- **THEN** `resultSchema` MUST resolve to primitive `bool`

---

### Requirement: Accessibility.closedCaptionsSettings exposes closed captions settings
The Accessibility module spec SHALL declare `closedCaptionsSettings` as a property with result type `ClosedCaptionsSettings` (an object with `enabled: bool` and `preferredLanguages: list of string`). The derived OpenRPC SHALL contain both `Accessibility.closedCaptionsSettings` (call) and `Accessibility.onClosedCaptionsSettingsChanged` (subscribe). Introduced in API version 8.0.0.

#### Scenario: closedCaptionsSettings getter returns structured type
- **WHEN** the inject-js bundle is generated
- **THEN** `_methodRegistry["Accessibility.closedCaptionsSettings"]` MUST exist with `kind: "call"`
- **THEN** `_typeSchemas["Accessibility.ClosedCaptionsSettings"]` MUST be an object schema with `enabled` (bool) and `preferredLanguages` (array of string) fields

#### Scenario: onClosedCaptionsSettingsChanged subscription is in method registry
- **WHEN** the inject-js bundle is generated
- **THEN** `_methodRegistry["Accessibility.onClosedCaptionsSettingsChanged"]` MUST exist with `kind: "subscribe"`

---

### Requirement: Accessibility.highContrastUI exposes high contrast UI setting
The Accessibility module spec SHALL declare `highContrastUI` as a property with result type `bool`. The derived OpenRPC SHALL contain both `Accessibility.highContrastUI` (call) and `Accessibility.onHighContrastUIChanged` (subscribe). Introduced in API version 8.0.0.

#### Scenario: highContrastUI getter is in method registry
- **WHEN** the inject-js bundle is generated
- **THEN** `_methodRegistry["Accessibility.highContrastUI"]` MUST exist with `kind: "call"`
- **THEN** `resultSchema` MUST resolve to primitive `bool`

#### Scenario: onHighContrastUIChanged subscription is in method registry
- **WHEN** the inject-js bundle is generated
- **THEN** `_methodRegistry["Accessibility.onHighContrastUIChanged"]` MUST exist with `kind: "subscribe"`

## MODIFIED Requirements

### Requirement: Accessibility.voiceGuidanceSettings includes event subscription
The Accessibility module spec SHALL declare `voiceGuidanceSettings` as a `properties` entry (not `actions`), so the derived OpenRPC contains both `Accessibility.voiceGuidanceSettings` (call, already present) AND `Accessibility.onVoiceGuidanceSettingsChanged` (subscribe, currently missing).

#### Scenario: voiceGuidanceSettings getter remains in method registry
- **WHEN** the Accessibility OpenRPC is regenerated
- **THEN** `_methodRegistry["Accessibility.voiceGuidanceSettings"]` MUST exist with `kind: "call"`
- **THEN** result schema MUST be `VoiceGuidanceSettings` object with `enabled`, `rate`, and `navigationHints`

#### Scenario: onVoiceGuidanceSettingsChanged subscription is added to method registry
- **WHEN** the inject-js bundle is generated from the updated Accessibility OpenRPC
- **THEN** `_methodRegistry["Accessibility.onVoiceGuidanceSettingsChanged"]` MUST exist with `kind: "subscribe"`
- **THEN** `resultSchema` MUST be the same `VoiceGuidanceSettings` type as the getter
