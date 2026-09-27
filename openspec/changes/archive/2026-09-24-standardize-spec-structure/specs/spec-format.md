## MODIFIED Requirements

### Requirement: Spec format documents new directory structure
The spec format documentation SHALL document the new directory structure with `openspec/specs/api/` for Firebolt API module specs, `openspec/specs/generator/` for generator tool specs, and `openspec/specs/_meta/` for meta guidelines. The documentation SHALL explain the separation of concerns and the purpose of each directory.

#### Scenario: Spec format shows api subdirectory
- **WHEN** authors read the spec format documentation
- **THEN** they SHALL see that API module specs live in `openspec/specs/api/<module>/spec.md`
- **THEN** they SHALL understand this is for Firebolt API module specifications only

#### Scenario: Spec format shows generator subdirectory
- **WHEN** authors read the spec format documentation
- **THEN** they SHALL see that generator tool specs live in `openspec/specs/generator/<tool>/spec.md`
- **THEN** they SHALL understand this is for generator tool requirements only

### Requirement: Spec format documents shared module special case
The spec format documentation SHALL document that the `shared` module is a special case where the `platform` field is optional, as it contains cross-module types used across all Firebolt API modules.

#### Scenario: Shared module platform field is documented as optional
- **WHEN** authors read the spec format documentation
- **THEN** they SHALL see that the `shared` module does not require the `platform` field
- **THEN** they SHALL understand this is because shared types are cross-module infrastructure