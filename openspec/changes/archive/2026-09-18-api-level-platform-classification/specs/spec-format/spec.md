## MODIFIED Requirements

### Requirement: Platform classification on API elements
The spec format SHALL support an optional `platform` field on individual actions, properties, and events. When specified, the `platform` field SHALL be one of: `web`, `native`, or `both`. When not specified, the API SHALL inherit the platform classification from the module's `platform` field.

#### Scenario: API with explicit platform override
- **WHEN** an action specifies `platform: native`
- **THEN** the action SHALL be available only to native SDK integrations
- **AND** web generators SHALL exclude this action from generated headers

#### Scenario: API without platform specification
- **WHEN** an action does not specify a `platform` field
- **THEN** the action SHALL inherit the module's `platform` classification
- **AND** generators SHALL treat it as if it had the module's platform explicitly

#### Scenario: Module with mixed platform APIs
- **WHEN** a module has `platform: both`
- **AND** contains actions with `platform: native` and `platform: web`
- **THEN** native generators SHALL include only the `platform: native` and unmarked actions
- **AND** web generators SHALL include only the `platform: web` and unmarked actions

### Requirement: Platform field validation
The spec format SHALL validate that method-level platform classifications are compatible with the module-level platform. A module with `platform: web` SHALL NOT contain methods with `platform: native`. A module with `platform: native` SHALL NOT contain methods with `platform: web`. A module with `platform: both` MAY contain any mix of method-level platforms.

#### Scenario: Invalid platform combination on web module
- **WHEN** a module has `platform: web`
- **AND** contains an action with `platform: native`
- **THEN** the spec SHALL be rejected with a validation error
- **AND** the error SHALL indicate that web-only modules cannot contain native-only methods

#### Scenario: Invalid platform combination on native module
- **WHEN** a module has `platform: native`
- **AND** contains an action with `platform: web`
- **THEN** the spec SHALL be rejected with a validation error
- **AND** the error SHALL indicate that native-only modules cannot contain web-only methods

#### Scenario: Valid mixed platform module
- **WHEN** a module has `platform: both`
- **AND** contains actions with mixed platform classifications
- **THEN** the spec SHALL be accepted
- **AND** no validation error SHALL occur

### Requirement: Platform field syntax
The `platform` field SHALL be specified using YAML syntax consistent with other spec fields. The field SHALL be optional and SHALL appear after the `description` field and before the `params` or `result` field.

#### Scenario: Action with platform field
- **WHEN** an action includes a `platform` field
- **THEN** the field SHALL use the syntax `platform: native`
- **AND** the field SHALL be placed before the `params` or `result` field

#### Scenario: Property with platform field
- **WHEN** a property includes a `platform` field
- **THEN** the field SHALL use the syntax `platform: web`
- **AND** the field SHALL be placed before the `result` field

#### Scenario: Event with platform field
- **WHEN** an event includes a `platform` field
- **THEN** the field SHALL use the syntax `platform: native`
- **AND** the field SHALL be placed before the `payload` field
