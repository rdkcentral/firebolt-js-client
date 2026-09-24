## MODIFIED Requirements

### Requirement: Generator conventions references api subdirectory paths
The generator conventions documentation SHALL reference the new directory structure with API module specs at `openspec/specs/api/<module>/spec.md` instead of the previous `openspec/specs/<module>/spec.md` path.

#### Scenario: Generator conventions shows updated paths
- **WHEN** authors read the generator conventions documentation
- **THEN** they SHALL see references to `openspec/specs/api/<module>/spec.md`
- **THEN** they SHALL not see references to the old `openspec/specs/<module>/spec.md` path