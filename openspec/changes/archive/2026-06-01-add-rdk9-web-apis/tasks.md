## 1. Spec — Update existing modules [spec]

- [x] 1.1 [spec] Update `openspec/specs/accessibility/spec.md`: convert `voiceGuidanceSettings` from `actions` to `properties`; add `audioDescription`, `closedCaptionsSettings`, `highContrastUI` as `properties` entries with types and examples
- [x] 1.2 [spec] Update `openspec/specs/localization/spec.md`: convert `onCountryChanged` event entry to a `properties` entry `country`; add `preferredAudioLanguages` and `presentationLanguage` as `properties` entries

## 2. Spec — Create new module specs [spec]

- [x] 2.1 [spec] Create `openspec/specs/actions/spec.md`: `platform: both`; `actions: start`; `properties: intent` with `IntentPayload` type
- [x] 2.2 [spec] Create `openspec/specs/advertising/spec.md`: `platform: both`; `actions: advertisingId` returning `AdvertisingId` type with `IfaType` and `Lmt` enums
- [x] 2.3 [spec] Create `openspec/specs/device/spec.md`: `platform: both`; `actions: uid, deviceClass`; `properties: hdr, dolbyAtmosExperienceAvailable`; types `DeviceClass`, `HdrCapabilities`
- [x] 2.4 [spec] Create `openspec/specs/display/spec.md`: `platform: web`; `actions: colorimetry, videoResolutions`; types `ColorimetryValue`, `VideoResolution` enums
- [x] 2.5 [spec] Create `openspec/specs/network/spec.md`: `platform: both`; `properties: connected`
- [x] 2.6 [spec] Create `openspec/specs/video-output/spec.md`: `platform: both`; `properties: resolution`; type `VideoResolution` object
- [x] 2.7 [spec] Create `openspec/specs/metrics/spec.md`: `platform: both`; 17 `actions` entries: `ready`, `startContent`, `stopContent`, `page`, `error`, `mediaLoadStart`, `mediaPlay`, `mediaPlaying`, `mediaPause`, `mediaWaiting`, `mediaSeeking`, `mediaSeeked`, `mediaRateChanged`, `mediaRenditionChanged`, `mediaEnded`, `event`, `appInfo`; type `ErrorType` enum; `$ref` `Shared.AgePolicy` for agePolicy params

## 3. OpenRPC — Update existing modules [openrpc]

- [x] 3.1 [openrpc] Update `src/openrpc/accessibility.json`: add methods `Accessibility.audioDescription`, `Accessibility.onAudioDescriptionChanged`, `Accessibility.closedCaptionsSettings`, `Accessibility.onClosedCaptionsSettingsChanged`, `Accessibility.highContrastUI`, `Accessibility.onHighContrastUIChanged`, `Accessibility.onVoiceGuidanceSettingsChanged`; add schema `ClosedCaptionsSettings`
- [x] 3.2 [openrpc] Update `src/openrpc/localization.json`: add method `Localization.country` (getter); add methods `Localization.preferredAudioLanguages`, `Localization.onPreferredAudioLanguagesChanged`, `Localization.presentationLanguage`, `Localization.onPresentationLanguageChanged`

## 4. OpenRPC — Create new module files [openrpc]

- [x] 4.1 [openrpc] Create `src/openrpc/actions.json`: methods `Actions.start`, `Actions.intent`, `Actions.onIntent`; schema `IntentPayload`
- [x] 4.2 [openrpc] Create `src/openrpc/advertising.json`: method `Advertising.advertisingId`; schemas `AdvertisingId`, `IfaType`, `Lmt`
- [x] 4.3 [openrpc] Create `src/openrpc/device.json`: methods `Device.uid`, `Device.deviceClass`, `Device.hdr`, `Device.onHdrChanged`, `Device.dolbyAtmosExperienceAvailable`, `Device.onDolbyAtmosExperienceAvailableChanged`; schemas `DeviceClass`, `HdrCapabilities`
- [x] 4.4 [openrpc] Create `src/openrpc/display.json`: methods `Display.colorimetry`, `Display.videoResolutions`; schemas `ColorimetryValue`, `VideoResolution` (`x-firebolt-platform: web`)
- [x] 4.5 [openrpc] Create `src/openrpc/network.json`: methods `Network.connected`, `Network.onConnectedChanged`
- [x] 4.6 [openrpc] Create `src/openrpc/video-output.json`: methods `VideoOutput.resolution`, `VideoOutput.onResolutionChanged`; schema `VideoResolution`
- [x] 4.7 [openrpc] Create `src/openrpc/metrics.json`: all 17 Metrics methods; schema `ErrorType`; reference `Shared.AgePolicy` for agePolicy params

## 5. AST — No changes required [ast]

- [x] 5.1 [ast] Confirm all new type patterns (enums, objects, arrays, optionals) parse correctly through existing `builder.ts` — no code changes expected; verify by running `npm test` after OpenRPC files are added

## 6. Test — Extend inject-js test coverage [test]

- [x] 6.1 [test] Extend `src/generators/inject-js.test.ts`: assert all new `Accessibility.*` method names are present in `_methodRegistry`
- [x] 6.2 [test] Extend `src/generators/inject-js.test.ts`: assert all new `Localization.*` method names are present
- [x] 6.3 [test] Extend `src/generators/inject-js.test.ts`: assert `Actions.*` methods are present
- [x] 6.4 [test] Extend `src/generators/inject-js.test.ts`: assert `Advertising.advertisingId` and its type schemas are present
- [x] 6.5 [test] Extend `src/generators/inject-js.test.ts`: assert all `Device.*` methods and `HdrCapabilities`, `DeviceClass` schemas are present
- [x] 6.6 [test] Extend `src/generators/inject-js.test.ts`: assert `Display.*` methods are present and `Display` module is excluded from native-only generator output
- [x] 6.7 [test] Extend `src/generators/inject-js.test.ts`: assert `Network.*` methods are present
- [x] 6.8 [test] Extend `src/generators/inject-js.test.ts`: assert `VideoOutput.*` methods are present
- [x] 6.9 [test] Extend `src/generators/inject-js.test.ts`: assert all 17 `Metrics.*` method names are present
- [x] 6.10 [test] Run full test suite (`npm test`) and verify all tests pass; run `npm run build` to confirm `firebolt-inject.js` is generated with correct method registry
