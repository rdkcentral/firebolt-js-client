## ADDED Requirements

### Requirement: TypeScript generators produce object parameter pattern
The TypeScript generators (typescript.ts and inject-js-types.ts) SHALL generate method signatures that use a single object parameter for all methods with parameters, instead of positional parameters.

#### Scenario: Method with multiple parameters
- **WHEN** a method has multiple parameters in the OpenRPC schema
- **THEN** the generator SHALL create a parameter interface with the naming convention `MethodParams`
- **AND** the method signature SHALL accept a single parameter of that interface type
- **AND** the parameter interface SHALL be organized under the `Firebolt.Module` namespace

#### Scenario: Method with single parameter
- **WHEN** a method has a single parameter in the OpenRPC schema
- **THEN** the generator SHALL create a parameter interface with the naming convention `MethodParams`
- **AND** the method signature SHALL accept a single parameter of that interface type
- **AND** the parameter interface SHALL be organized under the `Firebolt.Module` namespace

### Requirement: Event callbacks include cancellation parameter
The TypeScript generators SHALL generate event callback signatures with two parameters: the event payload and a boolean cancellation flag.

#### Scenario: Event subscription
- **WHEN** a developer subscribes to an event
- **THEN** the callback signature SHALL be `(event: T, cancelled: boolean) => void`
- **AND** the `cancelled` parameter SHALL be set to `true` when the subscription is cancelled due to connection failure
- **AND** the `cancelled` parameter SHALL be set to `false` for normal event delivery

### Requirement: Parameter interfaces use ModuleMethodParams naming convention
The TypeScript generators SHALL name parameter interfaces using the `MethodParams` convention (e.g., `StartParams`, `WatchedParams`) instead of `ModuleMethodParams`.

#### Scenario: Parameter interface naming
- **WHEN** generating a parameter interface for a method
- **THEN** the interface name SHALL be `MethodParams` (e.g., `StartParams` for the `start` method)
- **AND** the interface SHALL be scoped under the module namespace (e.g., `Firebolt.Actions.StartParams`)

### Requirement: JSDoc examples for methods with parameters
The TypeScript generators SHALL include JSDoc `@example` tags for all methods with parameters, showing realistic parameter values.

#### Scenario: Method with parameters
- **WHEN** a method has parameters
- **THEN** the generator SHALL add a JSDoc `@example` tag above the method signature
- **AND** the example SHALL show the parameter interface type annotation
- **AND** the example SHALL show realistic parameter values based on parameter names
- **AND** the example SHALL show the full method call with the namespace path

#### Scenario: Optional parameters in examples
- **WHEN** a method has optional parameters
- **THEN** the example SHALL include only required parameters to keep the example clean
- **AND** optional parameters SHALL be omitted from the example

### Requirement: Firebolt namespace export
The inject-js TypeScript generator SHALL export the `Firebolt` namespace for direct consumption.

#### Scenario: Namespace export
- **WHEN** generating the inject-js TypeScript definitions
- **THEN** the generator SHALL include `export as namespace Firebolt` at the end of the file
- **AND** the generator SHALL export the factory function and related types

### Requirement: Metrics module parameter interfaces
The TypeScript generators SHALL correctly generate parameter interfaces for Metrics module methods, avoiding incorrect primitive type mappings.

#### Scenario: Metrics methods with object parameters
- **WHEN** a Metrics method has a parameter that is an object type in the OpenRPC schema
- **THEN** the generator SHALL create a parameter interface with the correct structure
- **AND** the generator SHALL NOT treat the parameter as a primitive string

## MODIFIED Requirements

None - this change affects only generator implementation, not the Firebolt API specification.

## REMOVED Requirements

None - this change affects only generator implementation, not the Firebolt API specification.