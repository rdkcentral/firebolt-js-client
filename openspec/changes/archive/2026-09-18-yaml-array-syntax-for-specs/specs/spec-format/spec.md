## MODIFIED Requirements

### Requirement: Spec format uses YAML arrays for API definitions
The OpenSpec spec format SHALL use YAML arrays instead of nested objects for all API definition sections (properties, actions, events, types). Each array item MUST include an explicit `name:` field to identify the property, action, event, or type.

#### Scenario: Property definition uses array syntax
- **WHEN** authoring a property in a spec file
- **THEN** the property SHALL be defined as an array item with explicit `name:` field
- **AND** the structure SHALL be: `- name: <propertyName>` followed by property fields

#### Scenario: Action definition uses array syntax
- **WHEN** authoring an action in a spec file
- **THEN** the action SHALL be defined as an array item with explicit `name:` field
- **AND** the structure SHALL be: `- name: <actionName>` followed by action fields

#### Scenario: Event definition uses array syntax
- **WHEN** authoring an event in a spec file
- **THEN** the event SHALL be defined as an array item with explicit `name:` field
- **AND** the structure SHALL be: `- name: <eventName>` followed by event fields

#### Scenario: Type definition uses array syntax
- **WHEN** authoring a type in a spec file
- **THEN** the type SHALL be defined as an array item with explicit `name:` field
- **AND** the structure SHALL be: `- name: <typeName>` followed by type fields

#### Scenario: Object property fields use array syntax
- **WHEN** authoring properties within an object type definition
- **THEN** each property SHALL be defined as an array item with explicit `name:` field
- **AND** the structure SHALL be: `- name: <fieldName>` followed by field fields

### Requirement: Spec format provides array syntax examples
The spec-format.md document SHALL provide clear examples of the new array syntax for all API definition sections.

#### Scenario: Properties section example
- **WHEN** reading the spec-format.md properties section
- **THEN** the document SHALL show array syntax with explicit `name:` fields
- **AND** the example SHALL demonstrate multiple properties in array format

#### Scenario: Actions section example
- **WHEN** reading the spec-format.md actions section
- **THEN** the document SHALL show array syntax with explicit `name:` fields
- **AND** the example SHALL demonstrate action with params array

#### Scenario: Types section example
- **WHEN** reading the spec-format.md types section
- **THEN** the document SHALL show array syntax for both enum and object types
- **AND** the object type example SHALL show nested properties as arrays

### Requirement: Spec format documents array syntax benefits
The spec-format.md document SHALL explain the benefits of array syntax including improved GitHub Preview rendering and better scannability.

#### Scenario: GitHub rendering explanation
- **WHEN** reading the spec-format.md introduction
- **THEN** the document SHALL explain that array syntax renders better in GitHub Preview
- **AND** the explanation SHALL mention vertical list item rendering

#### Scenario: Scannability explanation
- **WHEN** reading the spec-format.md introduction
- **THEN** the document SHALL explain that array syntax improves scannability
- **AND** the explanation SHALL mention distinct list items for each definition