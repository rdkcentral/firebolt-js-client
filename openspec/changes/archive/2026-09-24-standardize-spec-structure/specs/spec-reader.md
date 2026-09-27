## MODIFIED Requirements

### Requirement: Spec reader loads API specs from api subdirectory
The spec reader SHALL load Firebolt API module specifications from the `openspec/specs/api/` subdirectory instead of the root `openspec/specs/` directory. The spec reader SHALL skip `_meta` and `generator` directories entirely to avoid attempting to parse generator tool specifications.

#### Scenario: Spec reader loads from api subdirectory
- **WHEN** the spec reader loads all specs
- **THEN** it SHALL read from `openspec/specs/api/<module>/spec.md`
- **THEN** it SHALL skip directories named `_meta` and `generator`
- **THEN** it SHALL not attempt to parse generator tool specifications

### Requirement: Spec reader handles optional platform field for shared module
The spec reader SHALL make the `platform` field validation optional for the `shared` module only. All other API modules SHALL continue to require the `platform` field as specified in the spec format.

#### Scenario: Shared module loads without platform field
- **WHEN** the spec reader loads the `shared` module specification
- **THEN** it SHALL not fail validation if the `platform` field is missing
- **THEN** it SHALL continue to process the shared module normally

#### Scenario: Other modules require platform field
- **WHEN** the spec reader loads any module other than `shared`
- **THEN** it SHALL require the `platform` field to be present
- **THEN** it SHALL fail validation if the `platform` field is missing

### Requirement: Spec reader maintains kebab-case to PascalCase conversion
The spec reader SHALL maintain the existing kebab-case to PascalCase directory name conversion logic (e.g., `video-output` → `VideoOutput`, `lifecycle2` → `Lifecycle2`) to support OpenSpec directory naming conventions while preserving Firebolt module naming conventions.

#### Scenario: Kebab-case directory converts to PascalCase
- **WHEN** the spec reader processes a directory named `video-output`
- **THEN** it SHALL convert the module name to `VideoOutput`
- **WHEN** the spec reader processes a directory named `lifecycle2`
- **THEN** it SHALL convert the module name to `Lifecycle2`