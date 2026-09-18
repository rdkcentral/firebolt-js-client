## Why

Current OpenSpec spec files use nested YAML objects for API definitions (properties, actions, events, types). When rendered in GitHub Preview, these appear as horizontal nested blocks rather than scannable vertical rows, making it difficult to review and understand API definitions at a glance. Since the Firebolt JS client is not yet used in production, this is the ideal time to improve the spec format without breaking existing consumers.

## What Changes

- **BREAKING**: Convert spec format from nested YAML objects to YAML arrays for all API definition sections
- Update `openspec/specs/_meta/spec-format.md` to document the new array syntax
- Update `openspec/specs/_meta/openrpc-derivation.md` to reflect array-based derivation rules
- Convert all existing spec files (15+ modules) from object syntax to array syntax
- Ensure AI derivation process handles the new array format correctly

## Capabilities

### New Capabilities
None (this is a format change, not new functionality)

### Modified Capabilities

- **spec-format**: Change the YAML frontmatter structure from nested objects to explicit arrays with `name:` fields for properties, actions, events, and types
- **openrpc-derivation**: Update derivation rules to extract names from explicit `name:` fields instead of object keys

## Impact

- **Spec authoring**: All 15+ existing spec files need conversion to array syntax
- **Documentation**: Meta-guidelines in `openspec/specs/_meta/` need updates
- **AI derivation**: The AI-assisted OpenRPC derivation process must handle array syntax
- **Testing**: End-to-end validation needed to ensure OpenRPC → AST → generated headers pipeline works correctly
- **No runtime impact**: This change only affects spec authoring and derivation, not the generated language headers or runtime behavior