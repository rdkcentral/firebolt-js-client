## Why

The current `openspec/specs/` directory mixes two fundamentally different types of specifications: Firebolt API module specs (used for code generation) and generator tool specs (used for defining generator requirements). This causes validation failures, naming inconsistencies, and makes the spec structure unclear. Separating these will improve organization, prevent spec reader errors, and align with OpenSpec conventions.

## What Changes

**BREAKING**: Reorganize `openspec/specs/` directory structure to separate API specs from generator specs.

- Create `openspec/specs/api/` directory for Firebolt API module specs only
- Create `openspec/specs/generator/` directory for generator tool specs only  
- Create `openspec/specs/_meta/shared/` for generic shared types/conventions
- Move existing API specs to `api/` subdirectory (accessibility, actions, advertising, device, discovery, display, lifecycle2, localization, metrics, network, shared, video-output)
- Move existing generator specs to `generator/` subdirectory (ast-builder, firebolt-cli, header-generation, wpe-inject-js-generator)
- Update `spec-reader.ts` to read from `api/` subdirectory for API specs
- Make `platform` field optional for `shared` module only (cross-module types)
- Update all meta documentation references to new directory structure
- Update archived change documentation to reflect historical paths

## Capabilities

### New Capabilities
None - this is a structural reorganization, not new functionality.

### Modified Capabilities
- `spec-reader`: Enhanced to read from `openspec/specs/api/` and handle optional platform field for shared module
- `spec-format`: Updated to document new directory structure and shared module special case
- `openrpc-derivation`: Updated path references for spec files
- `generator-conventions`: Updated path references for spec files

## Impact

- **Spec reader**: Will only load API specs from `api/` directory, ignoring generator specs
- **Meta documentation**: All references to `openspec/specs/<module>/spec.md` updated to `openspec/specs/api/<module>/spec.md`
- **Archived changes**: Historical path references noted as outdated
- **Tests**: Spec reader tests updated to use new directory structure
- **No API changes**: This is internal tooling reorganization only; generated API headers remain unchanged
