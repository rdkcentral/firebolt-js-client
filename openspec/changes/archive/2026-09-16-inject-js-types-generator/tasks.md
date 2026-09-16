## 1. Generator Implementation

- [x] 1.1 [generator] Create src/generators/inject-js-types.ts with full-AST generator structure
- [x] 1.2 [generator] Implement FireboltTransport interface generation
- [x] 1.3 [generator] Implement ExtensionSchema interface generation
- [x] 1.4 [generator] Implement FactoryConfig interface generation
- [x] 1.5 [generator] Implement FireboltBuilder interface generation
- [x] 1.6 [generator] Implement FireboltClient interface generation with module filtering
- [x] 1.7 [generator] Implement factory function declaration
- [x] 1.8 [generator] Implement export statements for public types
- [x] 1.9 [generator] Integrate existing type emission logic from typescript.ts
- [x] 1.10 [generator] Register generator using registerFullASTGenerator
- [x] 1.11 [generator] Add JSDoc comments to all generated interfaces and methods

## 2. Testing

- [x] 2.1 [test] Create src/generators/inject-js-types.test.ts with generator output tests
- [x] 2.2 [test] Add test for single file output generation
- [x] 2.3 [test] Add test for platform filtering (web/both included, native excluded)
- [x] 2.4 [test] Add test for transport interface structure
- [x] 2.5 [test] Add test for extension schema interface structure
- [x] 2.6 [test] Add test for factory configuration interface structure
- [x] 2.7 [test] Add test for FireboltClient interface with all modules
- [x] 2.8 [test] Add test for export statements presence
- [x] 2.9 [test] Add TypeScript compilation test for generated .d.ts file

## 3. Package Configuration

- [x] 3.1 [generator] Update package.json with @firebolt-js/types package name
- [x] 3.2 [generator] Add types field pointing to generated/inject-js/firebolt-inject.d.ts
- [x] 3.3 [generator] Add files field to include generated files
- [x] 3.4 [generator] Configure publishConfig for GitHub Packages registry
- [x] 3.5 [generator] Add build scripts for type generation
- [x] 3.6 [generator] Create .npmrc with GitHub Packages registry configuration

## 4. Package Structure

- [x] 4.1 [generator] Create package/ directory structure
- [x] 4.2 [generator] Create package/README.md with consumer documentation
- [x] 4.3 [generator] Create package/examples/basic-usage.ts with usage examples
- [x] 4.4 [generator] Set up package.json for the @firebolt-js/types package

## 5. Reference App

- [x] 5.1 [generator] Create references/firebolt-type-reference-app/ directory
- [x] 5.2 [generator] Create reference app package.json with @firebolt-js/types as dev dependency
- [x] 5.3 [generator] Create reference app tsconfig.json
- [x] 5.4 [generator] Create reference app index.html
- [x] 5.5 [generator] Create reference app src/main.ts with factory usage examples
- [x] 5.6 [generator] Create reference app src/mock-transport.ts for testing
- [x] 5.7 [generator] Create reference app README.md with testing instructions

## 6. Automation

- [x] 6.1 [test] Create references/automation/install-test.ts
- [x] 6.2 [test] Implement automated dev dependency installation test
- [x] 6.3 [test] Implement automated build test for reference app
- [x] 6.4 [test] Add verification that types are available after installation

## 7. Validation

- [x] 7.1 [test] Run generator and verify firebolt-inject.d.ts is created
- [x] 7.2 [test] Verify generated types match inject-js factory/builder pattern
- [x] 7.3 [test] Test TypeScript compiler validation of generated .d.ts file
- [x] 7.4 [test] Verify package builds successfully
- [x] 7.5 [test] Test local package installation in reference app
- [ ] 7.6 [test] Manual IDE testing via reference app (intellisense, hover docs, autocomplete) - MANUAL VERIFICATION REQUIRED