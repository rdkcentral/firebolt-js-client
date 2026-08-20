## ADDED Requirements

### Requirement: Localization.country exposes country getter
The Localization module spec SHALL add `country` as a property getter (the `onCountryChanged` event already exists). The derived OpenRPC SHALL add `Localization.country` (call) returning a string constrained to ISO 3166-1 alpha-2 format. Introduced in API version 8.0.0.

#### Scenario: country getter is in method registry
- **WHEN** the inject-js bundle is generated from the updated Localization OpenRPC
- **THEN** `_methodRegistry["Localization.country"]` MUST exist with `kind: "call"`
- **THEN** `resultSchema` MUST be a string primitive

---

### Requirement: Localization.preferredAudioLanguages exposes audio language preference
The Localization module spec SHALL declare `preferredAudioLanguages` as a property with result type `list of string` (ISO 639-2/B codes). The derived OpenRPC SHALL contain both `Localization.preferredAudioLanguages` (call) and `Localization.onPreferredAudioLanguagesChanged` (subscribe). Introduced in API version 8.0.0.

#### Scenario: preferredAudioLanguages getter is in method registry
- **WHEN** the inject-js bundle is generated
- **THEN** `_methodRegistry["Localization.preferredAudioLanguages"]` MUST exist with `kind: "call"`
- **THEN** `resultSchema` MUST be an array of string primitives

#### Scenario: onPreferredAudioLanguagesChanged subscription is in method registry
- **WHEN** the inject-js bundle is generated
- **THEN** `_methodRegistry["Localization.onPreferredAudioLanguagesChanged"]` MUST exist with `kind: "subscribe"`

---

### Requirement: Localization.presentationLanguage exposes UI language setting
The Localization module spec SHALL declare `presentationLanguage` as a property with result type `string` (BCP 47 locale tag). The derived OpenRPC SHALL contain both `Localization.presentationLanguage` (call) and `Localization.onPresentationLanguageChanged` (subscribe). Introduced in API version 8.0.0.

#### Scenario: presentationLanguage getter is in method registry
- **WHEN** the inject-js bundle is generated
- **THEN** `_methodRegistry["Localization.presentationLanguage"]` MUST exist with `kind: "call"`
- **THEN** `resultSchema` MUST be a string primitive

#### Scenario: onPresentationLanguageChanged subscription is in method registry
- **WHEN** the inject-js bundle is generated
- **THEN** `_methodRegistry["Localization.onPresentationLanguageChanged"]` MUST exist with `kind: "subscribe"`

## MODIFIED Requirements

### Requirement: Localization.onCountryChanged is paired with a country getter
The Localization module spec currently declares `onCountryChanged` as a standalone event. It SHALL be redeclared as a `properties` entry named `country` so that both the getter (`Localization.country`) and the event (`Localization.onCountryChanged`) are derived from the same spec entry with a consistent result type.

#### Scenario: onCountryChanged subscription is preserved in method registry
- **WHEN** the Localization OpenRPC is regenerated
- **THEN** `_methodRegistry["Localization.onCountryChanged"]` MUST still exist with `kind: "subscribe"`
- **THEN** `resultSchema` MUST be a string primitive (ISO 3166-1 alpha-2)
