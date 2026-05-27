## ADDED Requirements

### Requirement: Each generator is a pure function over the CanonicalAST
Every language generator SHALL accept a `CanonicalAST` and a `GenConfig` and return
a `Map<string, string>` of filename to file content. Generators MUST NOT read files,
make network calls, or have side effects.

#### Scenario: Same AST produces identical output across runs
- **WHEN** a generator is called twice with the same `CanonicalAST` and `GenConfig`
- **THEN** the output map MUST be byte-for-byte identical

### Requirement: TypeScript generator emits valid declaration files
The TypeScript generator SHALL emit one `.d.ts` file per module containing: string
literal union types for enums, `interface` declarations for objects, `declare namespace`
blocks for methods. All `kind: "call"` results SHALL be wrapped in `Promise<T>`.
All `kind: "subscribe"` methods SHALL emit a callback + unsubscribe signature.

#### Scenario: Enum emits string literal union using wire values
- **WHEN** the AST contains `EnumType { name:"AgePolicy", values:[{serializedId:"app:adult",...}] }`
- **THEN** the `.d.ts` MUST contain `type AgePolicy = "app:adult" | ...`
- **THEN** the output MUST pass `tsc --noEmit`

#### Scenario: Call method emits async Promise signature
- **WHEN** the AST contains `Method { kind:"call", result: PrimitiveRef(null) }`
- **THEN** the `.d.ts` MUST declare the method returning `Promise<void>`

#### Scenario: Subscribe method emits callback and unsubscribe
- **WHEN** the AST contains `Method { kind:"subscribe", result: NamedRef("StateChangedEvent") }`
- **THEN** the `.d.ts` MUST declare the method as `(callback: (event: StateChangedEvent) => void) => () => void`

#### Scenario: Optional param uses trailing question mark
- **WHEN** `Param.required` is `false`
- **THEN** the `.d.ts` parameter MUST be declared with `?` suffix (e.g. `progress?: number`)

### Requirement: ReScript generator emits valid external bindings
The ReScript generator SHALL emit one `.res` file per module using `@val external`
declarations, labelled optional args with `=?`, and `@as` decorators on enum variants.

#### Scenario: Enum emits variants with @as wire value
- **WHEN** `EnumValue.serializedId` differs from `EnumValue.identifier`
- **THEN** the `.res` MUST emit `| @as("<serializedId>") <Identifier>`

#### Scenario: Subscribe method returns unsubscribe function
- **WHEN** the AST contains `Method { kind:"subscribe" }`
- **THEN** the `.res` external MUST have return type `(unit => unit)`

### Requirement: Kotlin/JS generator emits valid external object declarations
The Kotlin/JS generator SHALL emit one `.kt` file per module using `external object`
for module namespaces, `external interface` for object types, and `enum class` for
enum types. Optional params SHALL use `= definedExternally`.

#### Scenario: Enum with wire value constructor
- **WHEN** an enum has values where `serializedId` contains non-identifier chars
- **THEN** the `.kt` MUST emit `enum class AgePolicy(val value: String) { AppAdult("app:adult"), ... }`

#### Scenario: Simple enum without constructor
- **WHEN** all enum values have `serializedId == identifier.lowercase()`
- **THEN** the `.kt` MUST emit `enum class LifecycleState { initializing, paused, ... }`

### Requirement: C++ generator emits valid native SDK headers
The C++ generator SHALL emit one `.hpp` file per module containing: `enum class`
declarations, `struct` declarations for objects, and free function declarations
returning `FireboltResult<T>`. Optional params SHALL use `std::optional<T>` with
`= std::nullopt`. The file SHALL include `"firebolt/result.hpp"`.

#### Scenario: Call method wraps result in FireboltResult
- **WHEN** the AST contains `Method { kind:"call", result: PrimitiveRef(null) }`
- **THEN** the `.hpp` MUST declare the function returning `FireboltResult<void>`

#### Scenario: Subscribe method uses std::function callback
- **WHEN** the AST contains `Method { kind:"subscribe", result: NamedRef("T") }`
- **THEN** the `.hpp` MUST declare `UnsubscribeFn onX(std::function<void(const T&)>)`

#### Scenario: C++ headers compile cleanly
- **WHEN** all generated `.hpp` files are compiled with `g++ -std=c++17 -c`
- **THEN** compilation MUST succeed with zero errors and zero warnings

### Requirement: Python generator emits both .pyi stub and .py protocol base
The Python generator SHALL emit two files per module in a single pass: a `.pyi` type
stub and a `_protocol.py` abstract base class. Enum types SHALL use `str, Enum` in
`.py` and `Literal[...]` in `.pyi`. `format: "date-time"` fields SHALL use `datetime`.

#### Scenario: date-time param uses datetime type in Python
- **WHEN** a param has `PrimitiveRef { primitive:"string", format:"date-time" }`
- **THEN** the `.pyi` MUST declare the param as `datetime` type
- **THEN** the `.py` MUST import `from datetime import datetime`

#### Scenario: Python stubs pass mypy
- **WHEN** all generated `.pyi` files are checked with `mypy --strict`
- **THEN** mypy MUST report zero errors

### Requirement: Enum identifier is consistent across all five generator outputs
For every `EnumValue`, the language-safe identifier used in generated code MUST be
derived solely from `EnumValue.identifier` (set by the AST builder). No generator
SHALL re-derive the identifier from `serializedId`.

#### Scenario: AppAdult appears identically in all generators
- **WHEN** `EnumValue { serializedId:"app:adult", identifier:"AppAdult" }` is in the AST
- **THEN** TypeScript output MUST use the wire value `"app:adult"` (string literal union)
- **THEN** ReScript output MUST use variant name `AppAdult` with `@as("app:adult")`
- **THEN** Kotlin/JS output MUST use member name `AppAdult`
- **THEN** C++ output MUST use enumerator `AppAdult`
- **THEN** Python output MUST use attribute name `AppAdult` with value `"app:adult"`

### Requirement: format:date-time is string in TS/ReScript/Kotlin/C++ and datetime in Python
The `format: "date-time"` annotation on a `PrimitiveRef` SHALL result in language-idiomatic
datetime types only in Python; all other targets SHALL keep the type as a plain string.

#### Scenario: watchedOn param type per language
- **WHEN** param `watchedOn` has `PrimitiveRef { primitive:"string", format:"date-time" }`
- **THEN** TypeScript output type MUST be `string`
- **THEN** ReScript output type MUST be `string`
- **THEN** Kotlin/JS output type MUST be `String`
- **THEN** C++ output type MUST be `std::string`
- **THEN** Python `.pyi` output type MUST be `datetime`
