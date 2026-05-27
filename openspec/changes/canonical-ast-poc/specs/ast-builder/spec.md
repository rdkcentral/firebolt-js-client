## ADDED Requirements

### Requirement: Builder parses OpenRPC methods into Method nodes
The AST builder SHALL accept one or more OpenRPC JSON documents and produce a `CanonicalAST`
containing one `Module` per document, with each OpenRPC method producing exactly one
`Method` node with the correct `kind`, `params`, and `result`.

#### Scenario: Action method produces call kind
- **WHEN** the OpenRPC document contains a method with no `subscribe` tag
- **THEN** the resulting `Method` node MUST have `kind: "call"`
- **THEN** `Method.params` MUST contain one `Param` per OpenRPC param in source order
- **THEN** `Method.result` MUST reflect the method's result schema as a `TypeRef`

#### Scenario: Subscribe method produces subscribe kind
- **WHEN** the OpenRPC document contains a method tagged with `{ "name": "subscribe" }`
- **THEN** the resulting `Method` node MUST have `kind: "subscribe"`

### Requirement: Builder strips listen param from subscribe methods (Rule 2)
The AST builder SHALL remove the `listen: boolean` param from every subscribe method.
The `listen` param is a transport detail injected at OpenRPC derivation time and MUST NOT
appear in the `CanonicalAST`.

#### Scenario: Subscribe method has no listen param in AST
- **WHEN** an OpenRPC subscribe method has a `listen` param
- **THEN** `Method.params` in the AST MUST NOT contain any param named `listen`
- **THEN** `Method.params` length MUST be zero for subscribe methods with no other params

### Requirement: Builder strips ListenResponse from subscribe result (Rule 1)
The AST builder SHALL unwrap the `oneOf[ListenResponse, PayloadType]` result schema
on every subscribe method and set `Method.result` to the payload type only.

#### Scenario: Subscribe method result is the payload type
- **WHEN** an OpenRPC subscribe method has `result.schema.oneOf: [ListenResponse, T]`
- **THEN** `Method.result` in the AST MUST be a `TypeRef` resolving to `T` only
- **THEN** `ListenResponse` MUST NOT appear anywhere in the resulting `Method` node

### Requirement: Builder derives EnumValue.identifier from serializedId (Rule 3)
The AST builder SHALL populate both `serializedId` and `identifier` on every `EnumValue`
node. The `identifier` is derived from `serializedId` using the canonical algorithm:
split on non-alphanumeric chars, PascalCase each segment, join, prepend enum name if
result starts with a digit.

#### Scenario: Wire value with colon separator
- **WHEN** an enum schema has a value `"app:adult"`
- **THEN** `EnumValue.serializedId` MUST equal `"app:adult"`
- **THEN** `EnumValue.identifier` MUST equal `"AppAdult"`

#### Scenario: Wire value with dot and digit
- **WHEN** an enum schema has a value `"dolbyDigital5.1"`
- **THEN** `EnumValue.identifier` MUST equal `"DolbyDigital51"`

#### Scenario: Plain alphanumeric wire value
- **WHEN** an enum schema has a value `"initializing"`
- **THEN** `EnumValue.identifier` MUST equal `"Initializing"`

#### Scenario: Identifier collision detection
- **WHEN** two enum values in the same enum derive the same identifier
- **THEN** the builder MUST throw a build error naming both wire values

### Requirement: Builder propagates format annotation on string schemas (Rule 5)
The AST builder SHALL set `PrimitiveRef.format` when the source JSON Schema string
field has a `"format"` property.

#### Scenario: date-time format propagates
- **WHEN** a param or field schema is `{ "type": "string", "format": "date-time" }`
- **THEN** the resulting `TypeRef` MUST be `PrimitiveRef { primitive: "string", format: "date-time" }`

### Requirement: Builder resolves $ref to NamedRef nodes (Rule 4)
The AST builder SHALL convert every JSON Schema `$ref` in a method param, result,
or object field to a `NamedRef` node, and populate `NamedRef.module` for cross-module refs.

#### Scenario: Same-module $ref
- **WHEN** a param schema is `{ "$ref": "#/components/schemas/AgePolicy" }`
- **THEN** the resulting `TypeRef` MUST be `NamedRef { kind: "named", name: "AgePolicy" }`
- **THEN** `NamedRef.module` MUST be undefined (same-module reference)

### Requirement: Builder handles anonymous inline schemas defensively (Rule 6)
The AST builder SHALL generate a synthetic `TypeDecl` name when a result or param
schema is defined inline rather than via `$ref`.

#### Scenario: Inline result schema gets synthetic name
- **WHEN** an OpenRPC method result schema is defined inline (not via `$ref`)
- **THEN** the builder MUST create a `TypeDecl` named `<Module><MethodName>Result`
- **THEN** the builder MUST emit a warning identifying the method and suggesting a named type
