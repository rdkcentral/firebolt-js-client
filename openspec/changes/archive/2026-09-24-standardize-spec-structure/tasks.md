## 1. Directory Structure Creation

- [x] 1.1 Create openspec/specs/api/ directory [spec]
- [x] 1.2 Create openspec/specs/generator/ directory [spec]
- [x] 1.3 Create openspec/specs/_meta/shared/ directory [spec]

## 2. API Spec Migration

- [x] 2.1 Move accessibility spec to api/ subdirectory [spec]
- [x] 2.2 Move actions spec to api/ subdirectory [spec]
- [x] 2.3 Move advertising spec to api/ subdirectory [spec]
- [x] 2.4 Move device spec to api/ subdirectory [spec]
- [x] 2.5 Move discovery spec to api/ subdirectory [spec]
- [x] 2.6 Move display spec to api/ subdirectory [spec]
- [x] 2.7 Move lifecycle2 spec to api/ subdirectory [spec]
- [x] 2.8 Move localization spec to api/ subdirectory [spec]
- [x] 2.9 Move metrics spec to api/ subdirectory [spec]
- [x] 2.10 Move network spec to api/ subdirectory [spec]
- [x] 2.11 Move shared spec to api/ subdirectory [spec]
- [x] 2.12 Move video-output spec to api/ subdirectory [spec]

## 3. Generator Spec Migration

- [x] 3.1 Move ast-builder spec to generator/ subdirectory [spec]
- [x] 3.2 Move firebolt-cli spec to generator/ subdirectory [spec]
- [x] 3.3 Move header-generation spec to generator/ subdirectory [spec]
- [x] 3.4 Move wpe-inject-js-generator spec to generator/ subdirectory [spec]

## 4. Spec Reader Implementation

- [x] 4.1 Update spec-reader.ts to read from api/ subdirectory [generator]
- [x] 4.2 Add logic to skip _meta and generator directories [generator]
- [x] 4.3 Make platform field optional for shared module only [generator]
- [x] 4.4 Verify kebab-case to PascalCase conversion still works [generator]

## 5. Documentation Updates

- [x] 5.1 Update spec-format.md with new directory structure [spec]
- [x] 5.2 Document shared module special case in spec-format.md [spec]
- [x] 5.3 Update openrpc-derivation.md path references [spec]
- [x] 5.4 Update generator-conventions.md path references [spec]
- [x] 5.5 Update config.yaml path references [spec]
- [x] 5.6 Update README.md path references [spec]

## 6. Archived Changes Documentation

- [x] 6.1 Update archived change path references (yaml-array-syntax-for-specs) [spec]
- [x] 6.2 Update archived change path references (firebolt-schema-device-metrics-updates) [spec]
- [x] 6.3 Update archived change path references (api-level-platform-classification) [spec]
- [x] 6.4 Update archived change path references (add-missing-firebolt-apis) [spec]
- [x] 6.5 Update archived change path references (other archived changes) [spec]

## 7. Test Updates

- [x] 7.1 Update spec-reader tests to use new directory structure [test]
- [x] 7.2 Update inject-js-types tests to use new directory structure [test]
- [x] 7.3 Update any other test files referencing spec paths [test]

## 8. Verification

- [x] 8.1 Run full test suite to verify all changes [test]
- [x] 8.2 Verify spec reader loads API specs correctly [test]
- [x] 8.3 Verify generator specs are not loaded by spec reader [test]
- [x] 8.4 Verify shared module loads without platform field [test]
- [x] 8.5 Clean up any remaining empty directories [spec]