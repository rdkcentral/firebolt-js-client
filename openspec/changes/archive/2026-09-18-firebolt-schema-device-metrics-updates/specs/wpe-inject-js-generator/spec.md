## MODIFIED Requirements

### Requirement: Parameter pattern detection
The inject-js generator SHALL detect and generate appropriate stubs for three parameter patterns: no-params, single-param, and single-primitive-wrap.

#### Scenario: Detect no-params pattern
- **WHEN** a method has zero parameters
- **THEN** the generator SHALL use the no-params pattern
- **AND** the generated stub SHALL accept no arguments

#### Scenario: Detect single-param pattern
- **WHEN** a method has one or more parameters
- **AND** the method does not match single-primitive-wrap criteria
- **THEN** the generator SHALL use the single-param pattern
- **AND** the generated stub SHALL accept an object parameter

#### Scenario: Detect single-primitive-wrap pattern
- **WHEN** a method has exactly 1 parameter
- **AND** that parameter is an object type
- **AND** that object has exactly 1 property
- **AND** that property is required
- **AND** that property is a primitive type
- **THEN** the generator SHALL use the single-primitive-wrap pattern
- **AND** the generated stub SHALL accept a single primitive value

### Requirement: Stub factory functions
The inject-js generator SHALL provide separate stub factory functions for each parameter pattern.

#### Scenario: No-params stub factory
- **WHEN** generating a no-params method
- **THEN** the generator SHALL call `_addMethodNoParams(module, methodName, moduleName)`
- **AND** the generated stub SHALL call `_rpcCall` with empty params object

#### Scenario: Single-param stub factory
- **WHEN** generating a single-param method
- **THEN** the generator SHALL call `_addMethodWithObjectParam(module, methodName, moduleName)`
- **AND** the generated stub SHALL accept an object parameter
- **AND** the stub SHALL pass the object to `_rpcCall`

#### Scenario: Single-primitive-wrap stub factory
- **WHEN** generating a single-primitive-wrap method
- **THEN** the generator SHALL call `_addMethodWithPrimitiveWrap(module, methodName, moduleName, paramName)`
- **AND** the generated stub SHALL accept a single primitive value
- **AND** the stub SHALL wrap the value in an object with the property name
- **AND** the stub SHALL pass the object to `_rpcCall`

## ADDED Requirements

### Requirement: Single-primitive-wrap pattern
The inject-js generator SHALL support a parameter pattern where a single primitive value is automatically wrapped in an object with a specific property name.

#### Scenario: Primitive-wrap method generation
- **WHEN** the generator processes a method matching single-primitive-wrap criteria
- **THEN** the generator SHALL emit a stub that accepts a single primitive value
- **AND** the stub SHALL create an object with the property name and value
- **AND** the stub SHALL pass the object to the JSON-RPC call

#### Scenario: Primitive-wrap method invocation
- **WHEN** a user calls a method using the single-primitive-wrap pattern
- **THEN** the user SHALL pass a single primitive value (e.g., string, number, boolean)
- **AND** the generated stub SHALL wrap the value in an object
- **AND** the JSON-RPC request SHALL contain the object with the property name
