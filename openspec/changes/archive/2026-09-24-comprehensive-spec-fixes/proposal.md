## Why

Multiple Firebolt API modules have spec inconsistencies, incorrect type definitions, and missing descriptions that cause type declaration issues and confusion for developers. These issues range from incorrect type definitions (e.g., intent as string instead of object) to missing enum details and incomplete descriptions that are critical for proper type generation and developer understanding.

## What Changes

- **Accessibility**: Fix `closedCaptionsSettings` and `onClosedCaptionsSettings` to correctly define `preferredLanguages` as list of strings (empty array if not initialized, ISO 639-2/B codes) and update description
- **Actions**: Fix `start`, `intent`, and `onIntent` to define `intent` parameter as JSON object type instead of string
- **Device**: Add detailed enum information for `deviceClass` (ott, stb, tv) with proper descriptions
- **Discovery**: Fix `watched` method to define correct types for `progress` (VOD: 0-0.99, live: seconds), `watchedOn` (ISO 8601 datetime), and `agePolicy` (string enum values)
- **Display**: Fix `colorimetry` and `videoResolutions` to be unordered lists of enums with proper descriptions and empty list behavior
- **Localization**: Update `presentationLanguage` description to clarify format (e.g., en-US)
- **Metrics**: Fix all Media*Params (MediaLoadStartParams, MediaPlayParams, MediaPlayingParams, MediaPauseParams, MediaWaitingParams, MediaEndedParams) to define `entityId` as string and `agePolicy` as optional string
- **VideoOutput**: Fix `resolution` and `onResolutionChanged` to define width/height as unsigned with specific allowed values and update description
- **VideoOutput**: Update `hdcp` and `onHdcpChanged` descriptions to clarify behavior for OTT/STB vs TV devices

## Capabilities

### New Capabilities
None

### Modified Capabilities

- `accessibility`: Fix closedCaptionsSettings/onClosedCaptionsSettings type definitions and descriptions
- `actions`: Fix intent parameter type from string to object for start/intent/onIntent
- `device`: Add detailed enum descriptions for deviceClass
- `discovery`: Fix watched method parameter types and descriptions
- `display`: Fix colorimetry and videoResolutions type definitions and descriptions
- `localization`: Update presentationLanguage description
- `metrics`: Fix all Media*Params type definitions for entityId and agePolicy
- `video-output`: Fix resolution type definition and update hdcp descriptions

## Impact

- Fixes type declaration generation across all language generators (TypeScript, Kotlin, C++, Python, ReScript)
- Improves developer experience with accurate type information and descriptions
- Ensures consistency between spec, OpenRPC, and generated code
- No breaking changes to API surface - only corrections to existing type definitions and descriptions
- Resolves potential type-checking failures and developer confusion