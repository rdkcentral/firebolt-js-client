## ADDED Requirements

### Requirement: Generator produces single TypeScript definition file
The inject-js-types generator SHALL emit a single `firebolt-inject.d.ts` file that contains TypeScript definitions matching the inject-js factory/builder pattern. The file SHALL be placed in the `generated/inject-js/` directory.

#### Scenario: Generator emits single definition file
- **WHEN** the inject-js-types generator is invoked with a Canonical AST
- **THEN** it MUST produce exactly one output file at `generated/inject-js/firebolt-inject.d.ts`
- **THEN** the file MUST contain TypeScript definitions for the factory, builder, and all FireboltClient modules

### Requirement: Generator is registered as full-AST generator
The inject-js-types generator SHALL be registered as a full-AST generator targeting the web platform using the `registerFullASTGenerator` function.

#### Scenario: Generator registration
- **WHEN** the generator module is imported
- **THEN** it MUST call `registerFullASTGenerator("inject-js-types", generate, "web")`
- **THEN** the generator MUST be invocable via `runAllFullAST(ast, config, ["inject-js-types"])`

### Requirement: Generator filters modules by platform
The inject-js-types generator SHALL include only modules whose platform is "web" or "both" in the generated TypeScript definitions. Modules with platform "native" SHALL be excluded.

#### Scenario: Web platform module is included
- **WHEN** the AST contains a module with platform "web"
- **THEN** that module's namespace and methods MUST appear in the generated TypeScript definitions

#### Scenario: Both platform module is included
- **WHEN** the AST contains a module with platform "both"
- **THEN** that module's namespace and methods MUST appear in the generated TypeScript definitions

#### Scenario: Native platform module is excluded
- **WHEN** the AST contains a module with platform "native"
- **THEN** that module MUST NOT appear in the generated TypeScript definitions

### Requirement: Generator defines transport interface
The inject-js-types generator SHALL emit a TypeScript interface for the FireboltTransport that matches the inject-js runtime requirements.

#### Scenario: Transport interface includes required methods
- **WHEN** the generator emits the FireboltTransport interface
- **THEN** it MUST include `send(data: string): void`
- **THEN** it MUST include `open(): void`
- **THEN** it MUST include `close(): void`

#### Scenario: Transport interface includes optional callbacks
- **WHEN** the generator emits the FireboltTransport interface
- **THEN** it MUST include optional `onMessage?: (raw: string) => void`
- **THEN** it MUST include optional `onOpen?: () => void`
- **THEN** it MUST include optional `onClose?: () => void`
- **THEN** it MUST include optional `onError?: (error: unknown) => void`

### Requirement: Generator defines extension schema interface
The inject-js-types generator SHALL emit a TypeScript interface for the ExtensionSchema that describes the structure for dynamic API extension.

#### Scenario: Extension schema interface has required name
- **WHEN** the generator emits the ExtensionSchema interface
- **THEN** it MUST include `name: string`

#### Scenario: Extension schema interface has optional method arrays
- **WHEN** the generator emits the ExtensionSchema interface
- **THEN** it MUST include optional `methods?: string[]`
- **THEN** it MUST include optional `events?: string[]`
- **THEN** it MUST include optional `methodsWithObject?: string[]`

### Requirement: Generator defines factory configuration interface
The inject-js-types generator SHALL emit a TypeScript interface for the FactoryConfig that accepts both transport and optional parameters.

#### Scenario: Factory config includes required transport
- **WHEN** the generator emits the FactoryConfig interface
- **THEN** it MUST include `transport: FireboltTransport`

#### Scenario: Factory config includes optional extension schema
- **WHEN** the generator emits the FactoryConfig interface
- **THEN** it MUST include `extensionSchema?: string | ExtensionSchema[]`

#### Scenario: Factory config includes optional debug flag
- **WHEN** the generator emits the FactoryConfig interface
- **THEN** it MUST include `enableDebug?: boolean`

### Requirement: Generator defines builder interface
The inject-js-types generator SHALL emit a TypeScript interface for the FireboltBuilder that matches the inject-js builder pattern.

#### Scenario: Builder interface has build method
- **WHEN** the generator emits the FireboltBuilder interface
- **THEN** it MUST include `build(): Promise<FireboltClient>`

### Requirement: Generator defines FireboltClient interface
The inject-js-types generator SHALL emit a TypeScript interface for the FireboltClient that includes all web/both platform modules and the cleanup method.

#### Scenario: FireboltClient includes all web/both modules
- **WHEN** the generator emits the FireboltClient interface
- **THEN** it MUST include a property for each module with platform "web" or "both"
- **THEN** each module property MUST use the pattern `ModuleName: typeof ModuleName`

#### Scenario: FireboltClient includes cleanup method
- **WHEN** the generator emits the FireboltClient interface
- **THEN** it MUST include `cleanup(): void`

### Requirement: Generator defines factory function type
The inject-js-types generator SHALL emit a TypeScript function declaration for the factory that accepts FactoryConfig and returns FireboltBuilder.

#### Scenario: Factory function signature is correct
- **WHEN** the generator emits the factory function declaration
- **THEN** it MUST be `declare function factory(config: FactoryConfig): FireboltBuilder`

### Requirement: Generator exports all public types
The inject-js-types generator SHALL export all public interfaces and the factory function for npm package consumption.

#### Scenario: All public types are exported
- **WHEN** the generator emits the export statements
- **THEN** it MUST export `factory`
- **THEN** it MUST export `FireboltClient`
- **THEN** it MUST export `FireboltTransport`
- **THEN** it MUST export `FactoryConfig`
- **THEN** it MUST export `ExtensionSchema`

### Requirement: Generator reuses existing type emission logic
The inject-js-types generator SHALL reuse the type emission functions from the existing typescript generator (emitTypeDecl, emitMethod, etc.) to ensure consistency.

#### Scenario: Type declarations match existing generator
- **WHEN** the generator emits type declarations (enums, interfaces)
- **THEN** the output MUST match the format produced by the typescript generator
- **THEN** enum serialized values MUST be identical
- **THEN** constraint formatting MUST be identical

#### Scenario: Method signatures match existing generator
- **WHEN** the generator emits method signatures
- **THEN** the output MUST match the format produced by the typescript generator
- **THEN** parameter types MUST be identical
- **THEN** return types MUST be identical
- **THEN** JSDoc comments MUST be preserved

### Requirement: Generator includes JSDoc documentation
The inject-js-types generator SHALL include JSDoc comments for all interfaces, methods, and parameters to enable IDE hover documentation.

#### Scenario: Interfaces have JSDoc comments
- **WHEN** the generator emits an interface
- **THEN** it MUST include a JSDoc comment describing the interface

#### Scenario: Methods have JSDoc comments
- **WHEN** the generator emits a method
- **THEN** it MUST include a JSDoc comment with the method description from the AST

#### Scenario: Parameters have JSDoc comments when available
- **WHEN** the generator emits a method with parameters
- **THEN** it MUST include JSDoc comments for parameters if descriptions are available in the AST