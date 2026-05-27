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
