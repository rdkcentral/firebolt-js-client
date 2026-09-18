## Why

Currently, platform classification (web/native/both) is only available at the module level. This forces all APIs within a module to share the same platform availability, which is too coarse-grained. Several Firebolt 9 APIs need platform-specific availability within the same module:

- Device module (platform: both) has APIs that are C++-only: `uptime`, `timeInActiveState`, `chipsetId`
- Localization module (platform: both) has APIs that are C++-only: `timezone`, `onTimezoneChanged`  
- Metrics module (platform: both) has APIs that are C++-only: `signIn`, `signOut`
- Display module (platform: web) could benefit from adding C++-only APIs like `size`, `maxResolution`, `connected`

Without API-level platform classification, these cases require either splitting modules (creating artificial module boundaries) or incorrectly exposing APIs to platforms where they don't exist.

## What Changes

- Add optional `platform` field to individual actions, properties, and events in spec format
- Extend AST to include optional `platform` on Method nodes
- Update OpenRPC derivation to emit `x-firebolt-platform` extension on methods
- Modify AST builder to parse method-level platform from OpenRPC
- Update generator filtering logic to filter methods by platform instead of entire modules
- Add validation to prevent impossible platform combinations (e.g., web-only module with native-only method)
- Update spec-format.md, generator-conventions.md, and openrpc-derivation.md meta-specs

**Default behavior**: If an API does not specify `platform`, it inherits from the module's `platform` setting.

## Capabilities

### New Capabilities
None - this is infrastructure/meta changes to the spec format and generator pipeline.

### Modified Capabilities
- `spec-format`: Add optional `platform` field to actions, properties, and events with inheritance rules
- `generator-conventions`: Update generator filtering logic from module-level to method-level platform filtering
- `openrpc-derivation`: Add derivation rule for method-level `x-firebolt-platform` extension
- `canonical-ast`: Add optional `platform` field to Method interface

## Impact

- **Spec format**: Authors can now specify platform availability per-API instead of per-module
- **AST types**: Method interface gains optional `platform` field
- **OpenRPC documents**: Methods gain optional `x-firebolt-platform` extension
- **Generators**: All 5 language generators (TypeScript, ReScript, Kotlin/JS, C++, Python) will filter methods by platform
- **Existing specs**: Device, Localization, Metrics, and Display modules will be updated to use per-API platform classification
- **Generated headers**: C++ headers will no longer include web-only APIs, web headers will no longer include native-only APIs
