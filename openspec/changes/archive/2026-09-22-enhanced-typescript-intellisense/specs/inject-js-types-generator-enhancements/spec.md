## ADDED Requirements

### Requirement: Module interface generation
The inject-js-types generator SHALL generate explicit module interfaces (e.g., `LocalizationModule`) that describe each module's methods and properties with full type information for improved intellisense.

#### Scenario: Generate module interface for web platform module
- **WHEN** generator processes a web platform module (e.g., Localization)
- **THEN** generator creates an interface named `<ModuleName>Module` (e.g., `LocalizationModule`)
- **AND** interface contains all method signatures from the module
- **AND** interface is placed under the Firebolt namespace (e.g., `Firebolt.LocalizationModule`)
- **AND** method signatures match those in the module namespace
- **AND** native-only methods are excluded from the interface

#### Scenario: Generate module interface for both platform module
- **WHEN** generator processes a both platform module (e.g., Device)
- **THEN** generator creates an interface named `<ModuleName>Module`
- **AND** interface includes only web-available methods
- **AND** native-only methods are excluded from the interface

#### Scenario: Module interface includes both call and subscribe methods
- **WHEN** generator creates a module interface
- **THEN** interface includes call methods with Promise<T> return types
- **AND** interface includes subscribe methods with callback and unsubscribe function return types

### Requirement: FireboltClient interface uses module interfaces
The FireboltClient interface SHALL use module interfaces instead of `typeof Firebolt.ModuleName` for module references to provide excellent intellisense.

#### Scenario: FireboltClient references module interfaces
- **WHEN** generator emits the FireboltClient interface
- **THEN** each module property uses the corresponding module interface type
- **AND** module properties are not typed as `typeof Firebolt.ModuleName`
- **AND** developer typing `firebolt.Localization.` sees method suggestions in IDE

#### Scenario: FireboltClient maintains cleanup method
- **WHEN** generator emits the FireboltClient interface
- **THEN** interface includes the cleanup() method
- **AND** cleanup method signature remains unchanged

### Requirement: Enhanced JSDoc with since version
The generator SHALL add `@since` tags to method JSDoc using version information from spec files.

#### Scenario: Add @since tag from spec data
- **WHEN** method spec includes a since field (e.g., "8.0.0")
- **THEN** generated JSDoc includes `@since 8.0.0` tag
- **AND** tag appears after the method description
- **AND** tag format matches JSDoc standard

#### Scenario: Handle missing since field
- **WHEN** method spec does not include a since field
- **THEN** generator omits the @since tag
- **AND** generation continues without error
- **AND** warning is logged for missing since information

### Requirement: Enhanced JSDoc with platform classification
The generator SHALL add `@platform` tags to method JSDoc indicating platform availability (web/native/both).

#### Scenario: Add @platform tag for web-only method
- **WHEN** method is classified as web platform
- **THEN** generated JSDoc includes `@platform web` tag
- **AND** tag indicates method is only available on web platform

#### Scenario: Add @platform tag for native-only method
- **WHEN** method is classified as native platform
- **THEN** generated JSDoc includes `@platform native` tag
- **AND** tag indicates method is only available on native platform

#### Scenario: Add @platform tag for both platform method
- **WHEN** method is classified as both platform or inherits from both platform module
- **THEN** generated JSDoc includes `@platform both` tag
- **AND** tag indicates method is available on all platforms

### Requirement: Enhanced JSDoc with detailed parameter descriptions
The generator SHALL add detailed `@param` tags to method JSDoc using parameter descriptions from spec files.

#### Scenario: Add @param with description from spec
- **WHEN** method has parameters with descriptions in spec
- **THEN** generated JSDoc includes `@param paramName - description` for each parameter
- **AND** description matches the spec parameter description
- **AND** parameter order matches method signature

#### Scenario: Handle missing parameter descriptions
- **WHEN** parameter description is missing from spec
- **THEN** generator uses AST parameter description as fallback
- **AND** @param tag is still generated with available description

### Requirement: Enhanced JSDoc with detailed return descriptions
The generator SHALL add enhanced `@returns` tags to method JSDoc including return type and description from spec files.

#### Scenario: Add @returns with type and description
- **WHEN** method has a return type with description in spec
- **THEN** generated JSDoc includes `@returns Promise<Type> - description`
- **AND** type matches the TypeScript return type
- **AND** description matches the spec result description

#### Scenario: Handle void return methods
- **WHEN** method returns void (null result in AST)
- **THEN** generated JSDoc includes `@returns Promise<void>`
- **AND** no description is added for void returns

### Requirement: Enhanced JSDoc with multiple examples
The generator SHALL add multiple `@example` blocks to method JSDoc using examples from spec files with descriptions.

#### Scenario: Add example with description
- **WHEN** method spec includes examples with descriptions
- **THEN** generated JSDoc includes `@example` block for each example
- **AND** example description appears as comment in JSDoc
- **AND** example code is formatted as valid JavaScript/TypeScript

#### Scenario: Format example for method with parameters
- **WHEN** method has parameters and spec includes example params
- **THEN** example code shows parameter object construction
- **AND** example uses realistic values from spec
- **AND** example shows method call with parameters

#### Scenario: Format example for method without parameters
- **WHEN** method has no parameters
- **THEN** example code shows direct method call
- **AND** example is concise and clear

#### Scenario: Format example for subscribe methods
- **WHEN** method is a subscribe (event) method
- **THEN** example code shows callback function with event parameter
- **AND** example shows unsubscribe function usage
- **AND** example includes cancelled parameter handling

#### Scenario: Handle missing examples
- **WHEN** method spec does not include examples
- **THEN** generator omits @example blocks
- **AND** generation continues without error
- **AND** basic JSDoc is still generated

### Requirement: Spec reader utility
The generator SHALL include a spec reader utility that reads spec.md files and extracts metadata for JSDoc generation.

#### Scenario: Read spec file for module
- **WHEN** generator needs spec data for a module
- **THEN** spec reader reads `openspec/specs/<module>/spec.md`
- **AND** parser extracts YAML frontmatter
- **AND** parser returns structured module data (description, version, platform, stability)

#### Scenario: Extract method metadata from spec
- **WHEN** spec reader processes method data
- **THEN** reader extracts method description, since field, platform field
- **AND** reader extracts examples array with descriptions and data
- **AND** reader extracts parameter descriptions
- **AND** reader extracts result type descriptions

#### Scenario: Handle missing spec file
- **WHEN** spec file does not exist for a module
- **THEN** spec reader returns null or empty data structure
- **AND** generator logs warning about missing spec file
- **AND** generation continues using AST data only

#### Scenario: Handle invalid YAML in spec file
- **WHEN** spec file contains invalid YAML
- **THEN** spec reader throws clear error with file name and parse error
- **AND** error message indicates which spec file failed to parse
- **AND** generation stops with clear error indication

#### Scenario: Cache spec data for performance
- **WHEN** generator processes multiple modules
- **THEN** spec reader loads all spec files once at startup
- **AND** parsed data is cached in memory for reuse
- **AND** subsequent module processing uses cached data

### Requirement: Graceful degradation for missing spec data
The generator SHALL gracefully degrade when spec data is incomplete or missing, using AST data as fallback.

#### Scenario: Degrade gracefully for missing since field
- **WHEN** spec data is available but since field is missing
- **THEN** generator omits @since tag
- **AND** other JSDoc enhancements are still applied
- **AND** generation completes successfully

#### Scenario: Degrade gracefully for missing examples
- **WHEN** spec data is available but examples array is empty
- **THEN** generator omits @example blocks
- **AND** other JSDoc enhancements are still applied
- **AND** generation completes successfully

#### Scenario: Use AST description when spec description missing
- **WHEN** spec data is available but method description is missing
- **THEN** generator uses AST method description
- **AND** JSDoc is still generated with available data
- **AND** generation completes successfully

### Requirement: Backward compatibility with existing namespaces
The generator SHALL maintain existing module namespace structure for backward compatibility while adding module interfaces.

#### Scenario: Generate both namespace and interface
- **WHEN** generator processes a module
- **THEN** both module namespace and module interface are generated
- **AND** namespace structure remains unchanged from previous version
- **AND** module interface is additional, not replacement

#### Scenario: Existing namespace usage continues to work
- **WHEN** existing code uses `Firebolt.Localization.country()`
- **THEN** code continues to work without modification
- **AND** type checking remains valid
- **AND** no breaking changes to existing API

### Requirement: Module interface JSDoc includes module metadata
Module interfaces SHALL include JSDoc with module-level metadata from spec files.

#### Scenario: Add module description to interface
- **WHEN** generator creates module interface
- **THEN** interface JSDoc includes module description from spec
- **AND** description provides overview of module purpose

#### Scenario: Add module platform to interface
- **WHEN** generator creates module interface
- **THEN** interface JSDoc includes `@platform` tag with module platform
- **AND** platform value matches spec platform field

#### Scenario: Add module version to interface
- **WHEN** generator creates module interface
- **THEN** interface JSDoc includes `@since` tag with module version
- **AND** version value matches spec version field

#### Scenario: Add module stability to interface
- **WHEN** generator creates module interface
- **THEN** interface JSDoc includes `@stability` tag with module stability
- **AND** stability value matches spec stability field
