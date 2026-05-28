## 1. Project Setup

- [x] 1.1 [spec] Author `openspec/specs/discovery/spec.md` — `AgePolicy` enum + `watched` action with all five params and one example
- [x] 1.2 [spec] Author `openspec/specs/lifecycle2/spec.md` — `LifecycleState` enum + `StateChangedEvent` object + `onStateChanged` event with one example
- [x] 1.3 [spec] Verify `openspec/specs/shared/spec.md` is complete with `ListenResponse` and `FireboltError`
- [x] 1.4 [spec] Initialise `package.json` with TypeScript project config and add dependencies: `typescript`, `commander`, `@open-rpc/schema-utils-js`, `@types/node`
- [x] 1.5 [spec] Create `tsconfig.json` targeting Node.js with strict mode enabled

## 2. OpenRPC Contracts

- [x] 2.1 [openrpc] Derive `src/openrpc/shared.json` from `shared/spec.md` — `ListenResponse` and `FireboltError` schemas; validate with `@open-rpc/schema-utils-js`
- [x] 2.2 [openrpc] Derive `src/openrpc/discovery.json` from `discovery/spec.md` — `Discovery.watched` method with five params and `AgePolicy` enum schema; validate
- [x] 2.3 [openrpc] Derive `src/openrpc/lifecycle2.json` from `lifecycle2/spec.md` — `Lifecycle2.onStateChanged` subscribe method with injected `listen` param, `oneOf[ListenResponse, StateChangedEvent]` result, `LifecycleState` and `StateChangedEvent` schemas; validate

## 3. AST Type Definitions

- [x] 3.1 [ast] Create `src/ast/types.ts` — implement all interfaces from `canonical-ast.md`: `CanonicalAST`, `Module`, `Method`, `Param`, `TypeDecl` union, `TypeRef` union, `PrimitiveKind`; file must pass `tsc --noEmit` with zero `any` types

## 4. AST Builder

- [x] 4.1 [ast] Create `src/ast/builder.ts` skeleton — `buildAST(files: object[]): CanonicalAST` signature, reads `info.version`, returns empty modules
- [x] 4.2 [ast] Implement method kind detection — detect `subscribe` from tags array; parse all params into `Param[]` with `TypeRef`; verify `Discovery.watched` produces 5-param `Method { kind:"call" }`
- [x] 4.3 [ast] Implement Rule 2 — strip `listen` param from subscribe methods; verify `Lifecycle2.onStateChanged` has empty `params` array
- [x] 4.4 [ast] Implement Rule 1 — unwrap `oneOf`, identify and strip `ListenResponse`, set `Method.result` to payload `TypeRef`; verify result is `NamedRef("StateChangedEvent")`
- [x] 4.5 [ast] Implement TypeDecl parsing for `EnumType` — parse `components/schemas` string-enum schemas; verify `AgePolicy` and `LifecycleState` parse with all values
- [x] 4.6 [ast] Implement TypeDecl parsing for `ObjectType` — parse object schemas with `$ref` fields; verify `StateChangedEvent` parses with two `NamedRef` fields
- [x] 4.7 [ast] Implement Rule 3 — enum identifier derivation; populate both `serializedId` and `identifier` on every `EnumValue`; verify `"app:adult"` → `AppAdult` and `"dolbyDigital5.1"` → `DolbyDigital51`; detect and throw on collisions
- [x] 4.8 [ast] Implement Rule 5 — propagate `format: "date-time"` from string schemas to `PrimitiveRef.format`; verify `watchedOn` param has `PrimitiveRef { primitive:"string", format:"date-time" }`
- [x] 4.9 [ast] Implement Rule 4 — resolve `$ref` to `NamedRef`; populate `NamedRef.module` for cross-module refs; verify `StateChangedEvent.oldState` is `NamedRef("LifecycleState")`
- [x] 4.10 [ast] Implement Rule 6 — detect inline anonymous schemas; create synthetic `TypeDecl` named `<Module><MethodName>Result`; emit warning
- [x] 4.11 [test] Write unit tests for builder Rules 1–3 and Rule 5 using minimal JSON fixtures; verify Rule 1 and Rule 2 with negative tests confirming stripped nodes are absent

## 5. Generator Infrastructure

- [x] 5.1 [generator] Create `src/generators/index.ts` — define `Generator` type and `GenConfig` interface; implement generator registry `Map<string, Generator>` and `runAll(ast, config): GeneratorOutput` helper

## 6. TypeScript Generator

- [x] 6.1 [generator] Create `src/generators/typescript.ts` — emit `EnumType` as string literal union (using `serializedId`), `ObjectType` as `interface`, `Method(call)` as `Promise<T>` in `declare namespace`, `Method(subscribe)` as callback + `() => void` unsubscribe; optional params with `?`
- [x] 6.2 [test] Verify `out/ts/Discovery.d.ts` and `out/ts/Lifecycle2.d.ts` pass `tsc --noEmit`

## 7. ReScript Generator

- [x] 7.1 [generator] Create `src/generators/rescript.ts` — emit `EnumType` with `@as` decorator on variants using `serializedId`, `ObjectType` as record type, `Method(call)` as `@val external` with labelled optional args, `Method(subscribe)` returning `(unit => unit)`
- [x] 7.2 [test] Verify `out/res/Discovery.res` and `out/res/Lifecycle2.res` parse with `rescript` compiler

## 8. Kotlin/JS Generator

- [x] 8.1 [generator] Create `src/generators/kotlin.ts` — emit `EnumType` as `enum class` with `val value: String` constructor when wire values contain non-identifier chars (else simple enum), `ObjectType` as `external interface`, `Method(call)` in `external object` returning `Promise<T>`, optional params as `= definedExternally`, `Method(subscribe)` returning `() -> Unit`
- [x] 8.2 [test] Verify `out/kt/Discovery.kt` and `out/kt/Lifecycle2.kt` compile with `kotlinc-js`

## 9. C++ Generator

- [x] 9.1 [generator] Hand-author `out/cpp/firebolt/result.hpp` — `FireboltError` struct, `FireboltResult<T>` template, `FireboltResult<void>` specialisation; add `static_assert` for C++17 minimum
- [x] 9.2 [generator] Create `src/generators/cpp.ts` — emit `enum class` with wire-value comments, `struct` for objects, free functions returning `FireboltResult<T>`, `std::optional<T>` for optional params, `UnsubscribeFn` typedef, `#include "firebolt/result.hpp"` at top
- [x] 9.3 [test] Verify `out/cpp/firebolt/Discovery.hpp` and `out/cpp/firebolt/Lifecycle2.hpp` compile with `g++ -std=c++17 -c` with zero warnings

## 10. Python Generator

- [x] 10.1 [generator] Create `src/generators/python.ts` — emit `.pyi` stub with `Literal[...]` for enums, `TypedDict` for objects, `async def` stubs, `datetime` for `format:"date-time"` params, `Callable[[T], None]` callbacks returning `Callable[[], None]`; emit `_protocol.py` with `str, Enum` classes, `@abstractmethod` methods
- [x] 10.2 [test] Verify all generated `.pyi` files pass `mypy --strict`

## 11. CLI

- [x] 11.1 [generator] Create `src/cli.ts` — `generate` command with `--modules`, `--targets`, `--outdir`, `--validate` options; wire full pipeline: load OpenRPC → validate → build AST → run generators → write files; exit code 1 on any error
- [x] 11.2 [test] Verify `npx ts-node src/cli.ts generate --modules Discovery,Lifecycle2 --targets ts,res,kt,cpp,py` exits 0 and writes all expected output files
- [x] 11.3 [test] Verify CLI exits non-zero and prints to stderr when passed an invalid OpenRPC file

## 12. Cross-Generator Consistency

- [x] 12.1 [test] Write cross-generator enum consistency test — assert `"app:adult"` → `AppAdult` identifier is consistent across all five generator outputs by reading the emitted files
- [x] 12.2 [test] Write `format:date-time` promotion test — assert `watchedOn` is `string`/`String`/`std::string` in TS/ReScript/Kotlin/C++ and `datetime` in Python `.pyi`
- [x] 12.3 [test] Write subscribe pattern consistency test — assert `onStateChanged` in all five outputs has a callback parameter and returns an unsubscribe token type
- [x] 12.4 [spec] Write `README.md` for the generator — prerequisites, how to run, how to add a new module, how to add a new language target

## 13. Platform Classification

- [x] 13.1 [spec] Add `platform: web | native | both` as a required field to all module specs; update `openspec/specs/_meta/spec-format.md` to document it as mandatory with a Platform Classification section
- [x] 13.2 [openrpc] Add `"x-firebolt-platform"` to the `info` object in all four OpenRPC documents (`discovery.json`, `lifecycle2.json`, `localization.json`, `accessibility.json`); update `openrpc-derivation.md` with the derivation rule
- [x] 13.3 [ast] Add `Platform` type (`"web" | "native" | "both"`) and `Module.platform` field to `src/ast/types.ts`
- [x] 13.4 [ast] Implement `parsePlatform()` in `src/ast/builder.ts` — reads `info["x-firebolt-platform"]`, validates it is present and in `{web, native, both}`, throws a descriptive `BuildError` otherwise
- [x] 13.5 [generator] Update generator registry in `src/generators/index.ts` — `registerGenerator(id, gen, targetPlatform)` stores the runtime target per generator; `runAll()` skips modules where `module.platform !== "both" && module.platform !== entry.targetPlatform`
- [x] 13.6 [test] Add platform tests to `builder.test.ts` — verify missing `x-firebolt-platform` throws; verify invalid value throws; verify `Lifecycle2` module has `platform: "native"`
- [x] 13.7 [test] Add platform filtering tests to `consistency.test.ts` (12.4) — verify `Lifecycle2` is absent from TS/ReScript/Kotlin outputs and present only in C++/Python outputs

## 14. Localization Module

- [x] 14.1 [spec] Author `openspec/specs/localization/spec.md` — `platform: both`; `onCountryChanged` subscribe event with payload `type: string, minLength: 2, maxLength: 2, pattern: "^[A-Z]{2}$"`; include worked example (`"US"`, `"GB"`)
- [x] 14.2 [openrpc] Derive `src/openrpc/localization.json` — `Localization.onCountryChanged` subscribe method; result is `oneOf[ListenResponse, { type:"string", minLength:2, maxLength:2, pattern:"^[A-Z]{2}$", description:"ISO 3166-1 alpha-2 country code" }]`
- [x] 14.3 [generator] Add Localization to the CLI module list; verify 6 output files generated: `ts/Localization.d.ts`, `res/Localization.res`, `kt/Localization.kt`, `cpp/firebolt/Localization.hpp`, `py/localization.pyi`, `py/localization_protocol.py`
- [x] 14.4 [test] Add 12.5 consistency tests — verify string constraint notes (`minLength=2`, `maxLength=2`, `pattern=^[A-Z]{2}$`) appear in all five generator outputs for `onCountryChanged`; verify Python emits `Annotated[str, "..."]` and imports `Annotated`

## 15. Accessibility Module

- [x] 15.1 [spec] Author `openspec/specs/accessibility/spec.md` — `platform: both`; `VoiceGuidanceSettings` object type with `enabled: bool`, `rate: double (minimum: 0.1, maximum: 10)`, `navigationHints: bool`; `voiceGuidanceSettings` action returning `$ref: VoiceGuidanceSettings`
- [x] 15.2 [openrpc] Derive `src/openrpc/accessibility.json` — `Accessibility.voiceGuidanceSettings` method with `result.$ref: VoiceGuidanceSettings`; `VoiceGuidanceSettings` schema in `components/schemas` with `rate` having `"type":"number", "format":"double", "minimum":0.1, "maximum":10`
- [x] 15.3 [generator] Add Accessibility to the CLI module list; verify 7 output files generated across all five targets (same pattern as Localization plus a second Python file)
- [x] 15.4 [test] Add 12.6 consistency tests — verify numeric constraint notes (`minimum=0.1`, `maximum=10`) appear on the `rate` property in all five generator outputs; verify Python emits `Annotated[float, "..."]`

## 16. Value Constraints (Rule 7)

- [x] 16.1 [spec] Update `openspec/specs/_meta/spec-format.md` — add String Constraints section (`minLength`, `maxLength`, `pattern`) and Numeric Constraints section (`minimum`, `maximum`) with rules, well-known tables, and worked examples
- [x] 16.2 [spec] Update `openspec/specs/_meta/openrpc-derivation.md` — add Rule 3a: String Constraint Mapping and Rule 3b: Numeric Constraint Mapping with derivation tables and full OpenRPC examples
- [x] 16.3 [ast] Rename `StringConstraints` → `Constraints` and add `minimum?: number` and `maximum?: number` to the interface in `src/ast/types.ts`; update `PrimitiveRef.constraints` doc comment
- [x] 16.4 [ast] Extend Rule 7 in `resolveTypeRef` (`src/ast/builder.ts`) — for `string` primitives populate `minLength`, `maxLength`, `pattern`; for `double`/`unsigned` primitives populate `minimum`, `maximum`; update the Rule 7 builder doc comment
- [x] 16.5 [generator] Update `src/generators/index.ts` — update `extractConstraints()` to unwrap `OptionalRef` and return `Constraints` from any `PrimitiveRef` (not just strings); update `formatConstraintNote()` to include `minimum` and `maximum` entries
- [x] 16.6 [generator] Update all 5 generators for method-level constraints — rename label from "String constraints" to "Constraints" in all `buildConstraintNote()` helpers; TypeScript: JSDoc `Constraints:` line on constrained method signatures; ReScript/Kotlin/C++: inline comment before declaration
- [x] 16.7 [generator] Update all 5 generators for object property-level constraints — in each `emitObject()` function, check each property's TypeRef with `extractConstraints()` and emit an inline/preceding comment for constrained properties; Python: use `Annotated[float, "..."]` in `primitiveToPy()` for constrained doubles; update `moduleUsesAnnotated()` to also walk type declaration properties
- [x] 16.8 [test] Add Rule 7 string constraint tests to `builder.test.ts` — fixture with `onCountryChanged`-style method; verify result `PrimitiveRef` carries `constraints: {minLength:2, maxLength:2, pattern:"^[A-Z]{2}$"}`; verify unconstrained string has no `constraints` property
- [x] 16.9 [test] Add Rule 7 numeric constraint tests to `builder.test.ts` — fixture with `VoiceGuidanceSettings`-style schema; verify `rate` property carries `constraints: {minimum:0.1, maximum:10}`; verify `enabled` (bool) has no `constraints` property
