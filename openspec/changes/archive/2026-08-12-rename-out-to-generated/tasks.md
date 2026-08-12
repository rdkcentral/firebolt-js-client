## 1. Code Changes

- [x] 1.1 Update default --outdir parameter in src/cli.ts from "out" to "generated"
- [x] 1.2 Update file path references in src/generators/inject-js.test.ts
- [x] 1.3 Update file path references in src/generators/inject-js-infra.test.ts
- [x] 1.4 Update file path references in src/generators/consistency.test.ts
- [x] 1.5 Verify no other source files reference the old "out/" directory path

## 2. Directory Rename

- [x] 2.1 Use git mv to rename out/ directory to generated/
- [x] 2.2 Verify all files moved correctly with git history preserved
- [x] 2.3 Verify directory structure is intact (ts/, kt/, cpp/, py/, res/, inject-js/ subdirectories)

## 3. Documentation Updates

- [x] 3.1 Update README.md output path table (lines 118-123)
- [x] 3.2 Update README.md architecture diagram references to out/ directory
- [x] 3.3 Update openspec/specs/firebolt-cli/spec.md output path references
- [x] 3.4 Update openspec/specs/header-generation/spec.md output path references  
- [x] 3.5 Update openspec/specs/wpe-inject-js-generator/spec.md output path references
- [x] 3.6 Review and update .github/workflows/ci.yml if it references output directory
- [x] 3.7 Review and update .github/workflows/release.yml if it references output directory

## 4. Verification

- [x] 4.1 Run npx ts-node src/cli.ts generate and verify output goes to generated/ directory
- [x] 4.2 Run npm test to ensure all tests pass with new directory structure
- [x] 4.3 Verify git log shows proper history for moved files
- [x] 4.4 Check for any remaining references to "out/" in codebase using grep
- [x] 4.5 Verify generated files are still properly tracked in git (not in .gitignore)

## 5. Migration Documentation

- [x] 5.1 Add migration notes to git commit message explaining the breaking change
- [x] 5.2 Document the --outdir out backward compatibility option
- [x] 5.3 Update CHANGELOG.md with breaking change notice
