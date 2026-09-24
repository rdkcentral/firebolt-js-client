## Why

Firebolt Web API schemas need to be updated to reflect the latest API contract requirements. The Metrics module requires parameter additions for several methods to support enhanced telemetry (entityId, agePolicy, and media-specific fields), and the ErrorType enum needs to be updated to match the current error classification system. Additionally, the inject-js generator needs a new parameter pattern to support ergonomic single-primitive parameter calls for methods like Metrics.appInfo. Since there are currently no users of these APIs, breaking changes are acceptable.

## What Changes

- **Device module**: Confirm Device.name property exists (no changes needed)
- **Metrics module**: Update 9 methods with new parameters:
  - `startContent` and `stopContent`: Add `entityId` (string) and `agePolicy` (string) parameters
  - `page`: Rename `pageName` to `pageId`, add optional `agePolicy` parameter
  - `error`: **BREAKING** - Replace parameters with new structure: `type` (enum), `code` (string), `description` (string), `visible` (bool), `parameters` (object, optional), `agePolicy` (string, optional)
  - `mediaSeeking`: Add `target` (double) parameter, make `agePolicy` optional
  - `mediaSeeked`: Add `position` (double) parameter, make `agePolicy` optional
  - `mediaRateChanged`: Add `rate` (double) parameter, make `agePolicy` optional
  - `mediaRenditionChanged`: Add `bitrate` (unsigned), `width` (unsigned), `height` (unsigned), `profile` (string, optional) parameters, make `agePolicy` optional
  - `event`: **BREAKING** - Replace `eventName`/`eventData` with `schema` (string), `data` (string), add optional `agePolicy` parameter
  - `appInfo`: **BREAKING** - Replace `agePolicy` with `build` (string) parameter
- **Metrics ErrorType enum**: **BREAKING** - Replace with new values: `network`, `media`, `restriction`, `entitlement`, `other`
- **Shared schemas**: Move `AgePolicy` schema from Discovery module to shared schemas for cross-module reuse
- **Discovery module**: Update to reference shared `AgePolicy` schema instead of local definition
- **inject-js generator**: Add new parameter pattern for single-primitive-wrap (e.g., `firebolt.Metrics.appInfo("buildInfo")` translates to `{ build: "buildInfo" }`)

## Capabilities

### New Capabilities
- `inject-js-primitive-wrap-pattern`: New parameter pattern for inject-js generator that accepts a single primitive value and wraps it in an object with a specific property name

### Modified Capabilities
- `metrics`: **BREAKING** - Multiple method parameter changes and ErrorType enum replacement
- `shared`: Add AgePolicy schema for cross-module reuse
- `discovery`: Update to reference shared AgePolicy schema instead of local definition
- `wpe-inject-js-generator`: Add single-primitive-wrap parameter pattern detection and generation

## Impact

- **OpenRPC schemas**: `src/openrpc/metrics.json`, `src/openrpc/shared.json`, `src/openrpc/discovery.json`
- **OpenSpec specs**: `openspec/specs/api/metrics/spec.md`, `openspec/specs/api/shared/spec.md`, `openspec/specs/api/discovery/spec.md`, `openspec/specs/api/wpe-inject-js-generator/spec.md`
- **Generator code**: `src/generators/inject-js.ts` - add pattern detection and new stub factory
- **Generated headers**: All language targets (TypeScript, ReScript, Kotlin, C++, Python) will be regenerated via `npm run generate`
- **Breaking changes**: Metrics API surface changes are breaking, but acceptable since no current users
