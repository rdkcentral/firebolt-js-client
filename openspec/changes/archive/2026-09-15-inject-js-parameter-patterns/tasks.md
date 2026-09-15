## 1. Generator Implementation

- [x] 1.1 [generator] Add paramCount metadata to method registry entries in emitMethodRegistry function
- [x] 1.2 [generator] Create _makeCallStubNoParams function for no-param methods
- [x] 1.3 [generator] Update _makeCallStub function to accept single parameter instead of params object
- [x] 1.4 [generator] Modify _buildFireboltInstance to select appropriate stub factory based on paramCount
- [x] 1.5 [generator] Update method registry entry format to include paramCount field

## 2. Test Implementation

- [x] 2.1 [test] Add test for no-param method stub (test 5.17)
- [x] 2.2 [test] Add test for single-param method with primitive value (test 5.18)
- [x] 2.3 [test] Add test for single-param method with object value (test 5.19)
- [x] 2.4 [test] Verify all existing tests still pass

## 3. Documentation

- [x] 3.1 [generator] Create parameter patterns documentation at openspec/specs/_meta/inject-js-parameter-patterns.md
- [x] 3.2 [generator] Document the two parameter patterns and their use cases
- [x] 3.3 [generator] Document the rationale for not implementing named arguments pattern

## 4. Verification

- [x] 4.1 [generator] Generate inject-js bundle with new parameter patterns
- [x] 4.2 [generator] Verify generated bundle includes paramCount metadata in method registry
- [x] 4.3 [generator] Verify generated bundle includes _makeCallStubNoParams function
- [x] 4.4 [generator] Verify generated bundle includes updated _buildFireboltInstance logic
- [x] 4.5 [test] Run all inject-js tests to ensure no regressions
