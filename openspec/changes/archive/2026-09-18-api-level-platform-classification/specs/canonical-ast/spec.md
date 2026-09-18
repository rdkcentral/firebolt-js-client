## MODIFIED Requirements

### Requirement: Method platform field
The Method interface in the Canonical AST SHALL include an optional `platform` field of type Platform. When a method has an explicit platform classification in the OpenRPC document (via `x-firebolt-platform` extension), the AST builder SHALL populate this field with the corresponding value. When a method does not have an explicit platform classification in the OpenRPC document, the AST builder SHALL set this field to `undefined`.

#### Scenario: Method with explicit platform
- **WHEN** the AST builder processes an OpenRPC method with `x-firebolt-platform: "native"`
- **THEN** the resulting Method node SHALL have `platform: "native"`
- **AND** the field SHALL be of type Platform

#### Scenario: Method without explicit platform
- **WHEN** the AST builder processes an OpenRPC method without `x-firebolt-platform`
- **THEN** the resulting Method node SHALL have `platform: undefined`
- **AND** the method SHALL inherit platform from the parent Module at generation time

#### Scenario: Platform field type
- **WHEN** the Method.platform field is populated
- **THEN** the value SHALL be one of: `"web"`, `"native"`, or `"both"`
- **AND** the type SHALL match the Platform type definition

### Requirement: Platform resolution helper
The AST SHALL provide a helper function `resolveMethodPlatform(method: Method, module: Module): Platform` that returns the effective platform for a method. The function SHALL return the method's platform if specified, otherwise the module's platform.

#### Scenario: Resolving method with explicit platform
- **WHEN** calling `resolveMethodPlatform` with a method that has `platform: "native"`
- **THEN** the function SHALL return `"native"`
- **AND** the module's platform SHALL be ignored

#### Scenario: Resolving method without explicit platform
- **WHEN** calling `resolveMethodPlatform` with a method that has `platform: undefined`
- **AND** the module has `platform: "web"`
- **THEN** the function SHALL return `"web"`
- **AND** the module's platform SHALL be used

#### Scenario: Resolving method on both platform module
- **WHEN** calling `resolveMethodPlatform` with a method that has `platform: undefined`
- **AND** the module has `platform: "both"`
- **THEN** the function SHALL return `"both"`
- **AND** the method SHALL be treated as available to all platforms
