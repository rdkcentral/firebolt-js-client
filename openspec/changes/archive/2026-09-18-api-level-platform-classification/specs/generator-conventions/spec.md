## MODIFIED Requirements

### Requirement: Method-level platform filtering
Generators SHALL filter individual methods based on their effective platform classification instead of filtering entire modules. The effective platform SHALL be the method's `platform` field if specified, otherwise the module's `platform` field. A generator SHALL include a method if the effective platform is `both` or matches the generator's target platform. A generator SHALL exclude a method if the effective platform is the opposite platform (web generator excludes native-only methods, native generator excludes web-only methods).

#### Scenario: Web generator filtering
- **WHEN** a web generator processes a module
- **AND** the module contains a method with `platform: native`
- **THEN** the web generator SHALL exclude that method from generated output
- **AND** the web generator SHALL include methods with `platform: web` or `platform: both`

#### Scenario: Native generator filtering
- **WHEN** a native generator processes a module
- **AND** the module contains a method with `platform: web`
- **THEN** the native generator SHALL exclude that method from generated output
- **AND** the native generator SHALL include methods with `platform: native` or `platform: both`

#### Scenario: Method without platform specification
- **WHEN** a method does not specify a `platform` field
- **AND** the module has `platform: both`
- **THEN** all generators SHALL include the method in their output
- **AND** the method SHALL be treated as if it had `platform: both`

### Requirement: Empty module handling
When a generator filters all methods from a module (no methods match the generator's target platform), the generator SHALL NOT generate any output file for that module. The generator SHALL skip the module entirely.

#### Scenario: No methods for web generator
- **WHEN** a web generator processes a module
- **AND** all methods in the module have `platform: native`
- **THEN** the web generator SHALL NOT generate a header file for that module
- **AND** the generator SHALL continue processing other modules

#### Scenario: No methods for native generator
- **WHEN** a native generator processes a module
- **AND** all methods in the module have `platform: web`
- **THEN** the native generator SHALL NOT generate a header file for that module
- **AND** the generator SHALL continue processing other modules

### Requirement: Type inclusion
Generators SHALL include all type declarations from a module in generated headers regardless of which methods use them. Types SHALL NOT be filtered based on method platform classification.

#### Scenario: Unused type in web generator
- **WHEN** a web generator processes a module
- **AND** the module contains a type used only by native-only methods
- **THEN** the web generator SHALL still include the type declaration in generated output
- **AND** the type SHALL be available in the web header even if unused

#### Scenario: Shared type across platforms
- **WHEN** a type is used by both web-only and native-only methods
- **THEN** both web and native generators SHALL include the type declaration
- **AND** the type SHALL be identical in both generated headers
