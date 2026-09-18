## MODIFIED Requirements

### Requirement: OpenRPC derivation extracts names from explicit name fields
The OpenRPC derivation process SHALL extract property, action, event, and type names from explicit `name:` fields in array items instead of using object keys.

#### Scenario: Property name extraction
- **WHEN** deriving OpenRPC from a spec with properties array
- **THEN** the derivation SHALL extract the property name from the `name:` field
- **AND** the derivation SHALL NOT use object keys as names

#### Scenario: Action name extraction
- **WHEN** deriving OpenRPC from a spec with actions array
- **THEN** the derivation SHALL extract the action name from the `name:` field
- **AND** the derivation SHALL NOT use object keys as names

#### Scenario: Event name extraction
- **WHEN** deriving OpenRPC from a spec with events array
- **THEN** the derivation SHALL extract the event name from the `name:` field
- **AND** the derivation SHALL NOT use object keys as names

#### Scenario: Type name extraction
- **WHEN** deriving OpenRPC from a spec with types array
- **THEN** the derivation SHALL extract the type name from the `name:` field
- **AND** the derivation SHALL NOT use object keys as names

#### Scenario: Object field name extraction
- **WHEN** deriving OpenRPC from an object type with properties array
- **THEN** the derivation SHALL extract each field name from the `name:` field
- **AND** the derivation SHALL NOT use object keys as names

### Requirement: OpenRPC derivation documentation shows array syntax
The openrpc-derivation.md document SHALL update all examples to use array syntax with explicit `name:` fields.

#### Scenario: Properties derivation example
- **WHEN** reading the properties derivation section
- **THEN** the example SHALL show array syntax with `name:` fields
- **AND** the example SHALL demonstrate extracting names from `name:` fields

#### Scenario: Actions derivation example
- **WHEN** reading the actions derivation section
- **THEN** the example SHALL show array syntax with `name:` fields
- **AND** the example SHALL demonstrate extracting names from `name:` fields

#### Scenario: Types derivation example
- **WHEN** reading the types derivation section
- **THEN** the example SHALL show array syntax for both enum and object types
- **AND** the object type example SHALL show nested properties as arrays

### Requirement: OpenRPC derivation maintains semantic equivalence
The OpenRPC derivation process SHALL produce semantically identical OpenRPC output when processing array syntax versus the old object syntax.

#### Scenario: Property derivation equivalence
- **WHEN** deriving a property from array syntax vs object syntax
- **THEN** the resulting OpenRPC method SHALL be identical
- **AND** the method name, params, result, and examples SHALL match

#### Scenario: Action derivation equivalence
- **WHEN** deriving an action from array syntax vs object syntax
- **THEN** the resulting OpenRPC method SHALL be identical
- **AND** the method name, params, result, and examples SHALL match

#### Scenario: Type derivation equivalence
- **WHEN** deriving a type from array syntax vs object syntax
- **THEN** the resulting OpenRPC schema SHALL be identical
- **AND** the schema structure, properties, and constraints SHALL match