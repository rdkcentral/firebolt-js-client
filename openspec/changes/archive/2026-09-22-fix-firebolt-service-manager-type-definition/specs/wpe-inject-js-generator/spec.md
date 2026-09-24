## ADDED Requirements

### Requirement: Type definition exposes FireboltServiceManager global
The inject-js-types generator SHALL emit a TypeScript declaration file that exposes a global `FireboltServiceManager` interface with `version` and `get()` properties, matching the actual WPE bridge implementation.

#### Scenario: FireboltServiceManager has version property
- **WHEN** the type definition is generated
- **THEN** it MUST include a global `FireboltServiceManager` interface
- **THEN** the interface MUST have a readonly `version: string` property

#### Scenario: FireboltServiceManager has get method
- **WHEN** the type definition is generated
- **THEN** the `FireboltServiceManager` interface MUST have a `get()` method
- **THEN** the `get()` method MUST return `Promise<FireboltClient>`

#### Scenario: Type definition does not expose factory pattern
- **WHEN** the type definition is generated
- **THEN** it MUST NOT export a factory function
- **THEN** it MUST NOT export `FireboltTransport` interface
- **THEN** it MUST NOT export `FactoryConfig` interface
- **THEN** it MUST NOT export `ExtensionSchema` interface

#### Scenario: Type definition exports FireboltClient
- **WHEN** the type definition is generated
- **THEN** it MUST export the `FireboltClient` interface
- **THEN** it MUST export all module namespaces (Accessibility, Actions, Advertising, etc.)
- **THEN** all module methods and events MUST maintain their existing signatures

#### Scenario: Type definition declares global FireboltServiceManager
- **WHEN** the type definition is generated
- **THEN** it MUST declare `FireboltServiceManager` as a global variable
- **THEN** the global MUST be readonly and non-configurable
- **THEN** the global MUST match the bridge implementation structure
