## ADDED Requirements

### Requirement: Single-primitive-wrap parameter pattern detection
The inject-js generator SHALL detect when a method signature matches the single-primitive-wrap pattern and generate an ergonomic stub that accepts a single primitive value and wraps it in an object.

#### Scenario: Method with single required primitive property
- **WHEN** a method has exactly 1 parameter
- **AND** that parameter is an object type
- **AND** that object has exactly 1 property
- **AND** that property is required
- **AND** that property is a primitive type (string, number, boolean, etc.)
- **THEN** the generator SHALL use the single-primitive-wrap pattern
- **AND** the generated stub SHALL accept a single primitive value
- **AND** the stub SHALL wrap the value in an object with the property name

#### Scenario: Method with multiple parameters
- **WHEN** a method has more than 1 parameter
- **THEN** the generator SHALL NOT use the single-primitive-wrap pattern
- **AND** the generator SHALL use the standard object parameter pattern

#### Scenario: Method with optional single property
- **WHEN** a method has exactly 1 parameter
- **AND** that parameter is an object type
- **AND** that object has exactly 1 property
- **AND** that property is optional (not required)
- **THEN** the generator SHALL NOT use the single-primitive-wrap pattern
- **AND** the generator SHALL use the standard object parameter pattern

#### Scenario: Method with non-primitive property
- **WHEN** a method has exactly 1 parameter
- **AND** that parameter is an object type
- **AND** that object has exactly 1 property
- **AND** that property is required
- **AND** that property is a complex type (object, array, etc.)
- **THEN** the generator SHALL NOT use the single-primitive-wrap pattern
- **AND** the generator SHALL use the standard object parameter pattern

### Requirement: Single-primitive-wrap stub factory
The inject-js generator SHALL provide a stub factory function that generates methods using the single-primitive-wrap pattern.

#### Scenario: Generate primitive-wrap stub
- **WHEN** the generator processes a method matching the single-primitive-wrap pattern
- **THEN** the generator SHALL call `_addMethodWithPrimitiveWrap(module, methodName, moduleName, paramName)`
- **AND** the generated stub SHALL accept a single primitive value
- **AND** the stub SHALL create an object with the property name and value
- **AND** the stub SHALL pass the object to the JSON-RPC call

#### Scenario: Primitive-wrap method invocation
- **WHEN** a user calls a method using the single-primitive-wrap pattern
- **THEN** the user SHALL pass a single primitive value
- **AND** the generated stub SHALL wrap the value in an object
- **AND** the JSON-RPC request SHALL contain the object with the property name

### Requirement: Metrics.appInfo primitive-wrap pattern
The Metrics.appInfo method SHALL use the single-primitive-wrap pattern to accept a build string parameter.

#### Scenario: appInfo with build string
- **WHEN** a user calls `firebolt.Metrics.appInfo("1.2.3")`
- **THEN** the generated stub SHALL wrap the string in `{ build: "1.2.3" }`
- **AND** the JSON-RPC request SHALL contain `{ build: "1.2.3" }` as params
