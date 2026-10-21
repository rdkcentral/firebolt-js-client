# Tasks

## 1. Spec Layer

- [x] 1.1 [spec] Archive Window spec from change to main specs directory at `openspec/specs/api/window/spec.md` and verify the file exists and contains the complete spec with addKeyIntercepts and removeKeyIntercepts actions

## 2. OpenRPC Layer

- [x] 2.1 [openrpc] Derive OpenRPC JSON from Window spec at `src/openrpc/window.json` and verify the file is valid JSON with openrpc version 1.2.4, info section with title "Window", version "9.0", x-firebolt-platform "web", and both methods with correct params and result schemas
- [x] 2.2 [openrpc] Verify OpenRPC JSON structure matches spec by checking that addKeyIntercepts has array string params and null result, and removeKeyIntercepts has array string params and null result

## 3. AST Layer

- [x] 3.1 [ast] Verify AST builder parses Window OpenRPC correctly by running the generator and checking that no AST parsing errors occur for the Window module

## 4. Generator Layer

- [x] 4.1 [generator] Generate TypeScript headers for Window module and verify `generated/ts/Window.d.ts` exists with addKeyIntercepts and removeKeyIntercepts functions taking string[] and returning Promise<void>
- [x] 4.2 [generator] Generate ReScript headers for Window module and verify `generated/res/Window.res` exists with external addKeyIntercepts and removeKeyIntercepts bindings
- [x] 4.3 [generator] Generate Kotlin/JS headers for Window module and verify `generated/kt/Window.kt` exists with addKeyIntercepts and removeKeyIntercepts functions
- [x] 4.4 [generator] Verify C++ and Python headers are NOT generated for Window module (platform: web only) by checking that no Window.hpp, Window.pyi, or Window_protocol.py files exist in generated directories

## 5. Test Layer

- [x] 5.1 [test] Run npm test to verify all existing tests still pass and no regressions are introduced
- [x] 5.2 [test] Run npm run generate to verify full generation pipeline succeeds for all modules including Window
- [x] 5.3 [test] Verify generated TypeScript types are valid by running tsc on the generated Window.d.ts file or checking that it compiles without errors
