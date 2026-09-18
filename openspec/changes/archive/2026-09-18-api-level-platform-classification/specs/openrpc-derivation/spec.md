## MODIFIED Requirements

### Requirement: Method-level platform derivation
When a spec declares a `platform` field on an action, property, or event, the OpenRPC derivation SHALL emit an `x-firebolt-platform` extension field on the corresponding method. The extension value SHALL be the platform value from the spec (`web`, `native`, or `both`). When a spec does not declare a `platform` field on an API element, the OpenRPC derivation SHALL NOT emit the `x-firebolt-platform` extension on that method (the method inherits from the module-level `x-firebolt-platform` in the `info` object).

#### Scenario: Action with platform override
- **WHEN** an action in the spec has `platform: native`
- **THEN** the derived OpenRPC method SHALL include `"x-firebolt-platform": "native"`
- **AND** the extension SHALL be a peer to other method-level fields like `params` and `result`

#### Scenario: Action without platform specification
- **WHEN** an action in the spec does not have a `platform` field
- **THEN** the derived OpenRPC method SHALL NOT include an `x-firebolt-platform` extension
- **AND** the method SHALL inherit platform from the module's `info.x-firebolt-platform`

#### Scenario: Property with platform override
- **WHEN** a property in the spec has `platform: web`
- **THEN** the derived OpenRPC getter method SHALL include `"x-firebolt-platform": "web"`
- **AND** the derived onChange subscription method SHALL also include `"x-firebolt-platform": "web"`

#### Scenario: Event with platform override
- **WHEN** an event in the spec has `platform: native`
- **THEN** the derived OpenRPC subscribe method SHALL include `"x-firebolt-platform": "native"`
- **AND** the extension SHALL be present on the subscribe method

### Requirement: Platform extension format
The `x-firebolt-platform` extension SHALL be a string field with valid values: `web`, `native`, or `both`. The extension SHALL be placed at the method level in the OpenRPC JSON structure, not within `params` or `result`.

#### Scenario: Extension placement
- **WHEN** a method includes the `x-firebolt-platform` extension
- **THEN** the extension SHALL be a direct child of the method object
- **AND** the extension SHALL not be nested within `params` or `result`

#### Scenario: Extension value validation
- **WHEN** the derivation process encounters an `x-firebolt-platform` extension
- **THEN** the value SHALL be validated against the allowed values: `web`, `native`, `both`
- **AND** invalid values SHALL cause a derivation error
