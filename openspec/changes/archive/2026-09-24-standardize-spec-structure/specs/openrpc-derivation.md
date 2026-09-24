## MODIFIED Requirements

### Requirement: OpenRPC derivation references api subdirectory paths
The OpenRPC derivation documentation SHALL reference the new directory structure with API module specs at `openspec/specs/api/<module>/spec.md` instead of the previous `openspec/specs/<module>/spec.md` path.

#### Scenario: OpenRPC derivation shows updated paths
- **WHEN** authors read the OpenRPC derivation documentation
- **THEN** they SHALL see references to `openspec/specs/api/<module>/spec.md`
- **THEN** they SHALL not see references to the old `openspec/specs/<module>/spec.md` path