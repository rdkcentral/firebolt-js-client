## Why

The Firebolt 9 API specification defines 36 approved methods across 9 modules,
but the JS client currently implements only 3 of them. The `firebolt-inject.js`
bundle emitted by the inject-js generator is therefore missing the full method
registry that WPE-hosted apps depend on at runtime.

## What Changes

- **New specs** for 7 modules: Actions, Advertising, Device, Display, Metrics, Network, VideoOutput
- **Updated specs** for 2 existing modules: Accessibility (3 missing property pairs + event for voiceGuidanceSettings), Localization (getter for country + 2 missing property pairs)
- **New/updated OpenRPC JSON** for all 9 modules (derived from specs)
- **`firebolt-inject.js`** output gains ~45 additional method entries in `_methodRegistry` and all associated type schemas

No breaking changes — all existing OpenRPC methods and types are preserved unchanged.

## Capabilities

### New Capabilities

- `actions`: Platform intent dispatch (`start`) and last-received intent getter/event (`intent` / `onIntent`)
- `advertising`: Advertising ID retrieval (`advertisingId` — IFA, IFA type, LMT flag)
- `device`: Device identity and class (`uid`, `deviceClass`), HDR support (`hdr` / `onHdrChanged`), Dolby Atmos availability (`dolbyAtmosExperienceAvailable` / `onDolbyAtmosExperienceAvailableChanged`)
- `display`: Display colorimetry and video resolution capability lists — JS-only (`colorimetry`, `videoResolutions`; `platform: web`)
- `metrics`: Full app metrics event suite — 17 fire-and-forget action methods (`ready`, `startContent`, `stopContent`, `page`, `error`, `mediaLoadStart`, `mediaPlay`, `mediaPlaying`, `mediaPause`, `mediaWaiting`, `mediaSeeking`, `mediaSeeked`, `mediaRateChanged`, `mediaRenditionChanged`, `mediaEnded`, `event`, `appInfo`)
- `network`: Network connectivity getter/event (`connected` / `onConnectedChanged`)
- `video-output`: Video output resolution getter/event (`resolution` / `onResolutionChanged`)

### Modified Capabilities

- `accessibility`: Add missing property pairs `audioDescription` / `onAudioDescriptionChanged`, `closedCaptionsSettings` / `onClosedCaptionsSettingsChanged`, `highContrastUI` / `onHighContrastUIChanged`, and the missing `onVoiceGuidanceSettingsChanged` event for the existing `voiceGuidanceSettings` getter
- `localization`: Add missing `country` getter (event `onCountryChanged` already present), and add property pairs `preferredAudioLanguages` / `onPreferredAudioLanguagesChanged`, `presentationLanguage` / `onPresentationLanguageChanged`

## Impact

- **Pipeline Impact**: spec → OpenRPC → AST (no new node types) → inject-js generator (automatic — no code changes required)
- **Target output**: `out/inject-js/firebolt-inject.js` — `_methodRegistry` grows from 3 entries to ~48; `_typeSchemas` gains corresponding type definitions
- **Generator changes**: None — existing inject-js generator already handles all type patterns introduced (primitives, objects, enums, arrays, optionals) and already filters to `platform: web | both`
- **OpenRPC files added**: `src/openrpc/actions.json`, `advertising.json`, `device.json`, `display.json`, `metrics.json`, `network.json`, `video-output.json`
- **OpenRPC files updated**: `src/openrpc/accessibility.json`, `localization.json`
- **Spec files added**: `openspec/specs/actions/spec.md`, `advertising/spec.md`, `device/spec.md`, `display/spec.md`, `metrics/spec.md`, `network/spec.md`, `video-output/spec.md`
- **Spec files updated**: `openspec/specs/accessibility/spec.md`, `localization/spec.md`
