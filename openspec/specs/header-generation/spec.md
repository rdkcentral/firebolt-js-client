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

---

### Requirement: Generator registry filters modules by platform
Generators are registered with a `targetPlatform` of `"web"` or `"native"`. When
`runAll()` processes modules, it SHALL skip any module whose `platform` does not
match the generator's `targetPlatform` (unless `module.platform === "both"`).

#### Scenario: Native-only module absent from web generator output
- **WHEN** `module.platform === "native"` and the TypeScript generator targets `"web"`
- **THEN** no `.d.ts` file MUST be emitted for that module

#### Scenario: Both-platform module present in all five generator outputs
- **WHEN** `module.platform === "both"`
- **THEN** all five generators MUST emit their output file for that module

#### Scenario: Lifecycle2 (native) absent from web targets
- **WHEN** `Lifecycle2.platform === "native"`
- **THEN** no `Lifecycle2.d.ts`, `Lifecycle2.res`, or `Lifecycle2.kt` MUST be written
- **THEN** `Lifecycle2.hpp` and `lifecycle2.pyi` MUST be written

---

### Requirement: All generators emit constraint notes on constrained method signatures
When a method has params or a result whose `TypeRef` resolves to a constrained
`PrimitiveRef` (i.e., `PrimitiveRef.constraints` is defined), each generator SHALL
emit a human-readable constraint annotation on the method declaration.

#### Scenario: TypeScript JSDoc on constrained subscribe method
- **WHEN** `Method.result` is `PrimitiveRef { primitive:"string", constraints:{ minLength:2, ... } }`
- **THEN** the `.d.ts` method declaration MUST have a preceding JSDoc comment containing `minLength=2`

#### Scenario: ReScript comment on constrained method
- **WHEN** the same constrained method is processed by the ReScript generator
- **THEN** a `/* Constraints — result: minLength=2, ... */` comment MUST precede the `external` declaration

#### Scenario: Kotlin KDoc on constrained method
- **WHEN** the same constrained method is processed by the Kotlin generator
- **THEN** a `/** Constraints — result: ... */` comment MUST precede the `fun` declaration

#### Scenario: C++ comment on constrained method
- **WHEN** the same constrained method is processed by the C++ generator
- **THEN** a `// Constraints — result: ...` comment MUST precede the function declaration

---

### Requirement: All generators emit constraint annotations on constrained object properties
When an `ObjectTypeDecl` property's `TypeRef` resolves to a constrained `PrimitiveRef`,
each generator SHALL emit the constraint annotation inline on or adjacent to that property.

#### Scenario: TypeScript JSDoc comment above constrained property
- **WHEN** `ObjectProperty { name:"rate", type:PrimitiveRef { primitive:"double", constraints:{ minimum:0.1, maximum:10 } } }`
- **THEN** the `.d.ts` MUST emit `/** Constraints: minimum=0.1, maximum=10 */` immediately before the `rate: number;` line

#### Scenario: Kotlin inline comment on constrained property
- **WHEN** the same property is processed by the Kotlin generator
- **THEN** the `.kt` MUST emit `val rate: Double // minimum=0.1, maximum=10`

#### Scenario: C++ inline comment on constrained struct field
- **WHEN** the same property is processed by the C++ generator
- **THEN** the `.hpp` MUST emit `double rate; // minimum=0.1, maximum=10`

#### Scenario: ReScript inline comment on constrained record field
- **WHEN** the same property is processed by the ReScript generator
- **THEN** the `.res` MUST emit `rate: float, /* minimum=0.1, maximum=10 */`

---

### Requirement: Python generator emits Annotated types for constrained primitives
When a method param, result, or object property has a constrained `PrimitiveRef`,
the Python generator SHALL emit `Annotated[str, "..."]` (for strings) or
`Annotated[float, "..."]` (for doubles/unsigned) instead of the bare type.
The `Annotated` annotation string SHALL be the output of `formatConstraintNote()`.
The generator SHALL conditionally emit `from typing import Annotated` only when
at least one constrained field is present in the module.

#### Scenario: Constrained string param uses Annotated[str, ...]
- **WHEN** a method result is `PrimitiveRef { primitive:"string", constraints:{ minLength:2, maxLength:2, pattern:"^[A-Z]{2}$" } }`
- **THEN** the `.pyi` MUST use `Annotated[str, "minLength=2, maxLength=2, pattern=^[A-Z]{2}$"]`
- **THEN** the `.pyi` MUST contain `from typing import Annotated`

#### Scenario: Constrained double property uses Annotated[float, ...]
- **WHEN** `ObjectProperty { name:"rate", type:PrimitiveRef { primitive:"double", constraints:{ minimum:0.1, maximum:10 } } }`
- **THEN** the `.pyi` class MUST declare `rate: Annotated[float, "minimum=0.1, maximum=10"]`
- **THEN** the `.pyi` MUST contain `from typing import Annotated`

#### Scenario: Unconstrained module does not import Annotated
- **WHEN** a module has no constrained params, results, or object properties
- **THEN** the `.pyi` MUST NOT contain `from typing import Annotated`

### Requirement: A FullASTGenerator type accepts the full CanonicalAST
The generator infrastructure SHALL define a `FullASTGenerator` type with the signature `(ast: CanonicalAST, config: GenConfig) => GeneratorOutput[]`. It SHALL be registered via `registerFullASTGenerator(id, gen, targetPlatform)` and dispatched via `runAllFullAST(ast, config, targets?)`. A full-AST generator receives the complete `CanonicalAST` once per run, not once per module.

#### Scenario: FullASTGenerator is invoked once per run
- **WHEN** `runAllFullAST` is called with an AST containing three modules
- **THEN** the registered full-AST generator MUST be called exactly once
- **THEN** it MUST receive the full AST object (all three modules accessible)

#### Scenario: FullASTGenerator platform filtering applies at run time
- **WHEN** a full-AST generator is registered with `targetPlatform: "web"`
- **WHEN** `runAllFullAST` is called and a `"native"`-only module exists in the AST
- **THEN** the generator is still called once with the full AST (platform filtering is the generator's responsibility, not the registry's)

#### Scenario: FullASTGenerator target filter works
- **WHEN** `runAllFullAST` is called with `targets: ["inject-js"]`
- **THEN** only the `inject-js` generator MUST be invoked
- **THEN** no per-module generators MUST be called by `runAllFullAST`
