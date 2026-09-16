## Context

The current repository tracks auto-generated language headers in the `generated/` folder. These files are produced by the generator pipeline from OpenRPC contracts and include TypeScript (.d.ts), ReScript (.res), Kotlin/JS (.kt), C++ (.hpp), and Python (.pyi/.py) files. The repository also has a `package/` folder that contains the distribution package with its own build process for generating type definitions.

Currently, both the generated files and the package folder are tracked in git, which creates redundancy and unnecessary commit noise when files are regenerated.

## Goals / Non-Goals

**Goals:**
- Exclude generated/ folder from git tracking to reduce repository size and commit noise
- Maintain the ability to regenerate files locally via `npm run generate`
- Preserve the package/ folder as tracked since it contains hand-authored distribution files
- Ensure no impact on existing build processes or CI/CD workflows

**Non-Goals:**
- Changing the generator pipeline or AST structure
- Modifying the content or format of generated files
- Altering the package build process
- Changing which files are generated or their internal structure

## Decisions

### 1. Gitignore Pattern Selection
**Decision:** Use `generated/*` pattern in root `.gitignore` to exclude all generated language files.

**Rationale:** The `generated/*` pattern excludes the entire directory contents while preserving the directory structure if needed. This is the standard approach for build artifacts in git repositories.

**Alternative considered:** Individual file patterns like `generated/**/*.d.ts` - rejected because it would require maintaining a long list of patterns and would need updates when new file types are added.

### 2. Root-Level Type Definition Exclusion
**Decision:** Add `firebolt-inject.d.ts` to root `.gitignore` to exclude the root-level type definition file.

**Rationale:** The root-level `firebolt-inject.d.ts` is identical to the one in `generated/inject-js/` and can be regenerated. The package folder already has its own `.gitignore` that excludes this file, indicating it's meant to be built/copied, not committed.

**Alternative considered:** Keep the root-level file tracked - rejected because it creates inconsistency with the package folder approach and is redundant.

### 3. Package Folder Preservation
**Decision:** Keep the package/ folder and its contents tracked in git.

**Rationale:** The package folder contains hand-authored files (README.md, package.json, examples) that should be versioned. The package build process generates the necessary type definitions during build time via the build script: `npm run generate -- --targets inject-js-types && cp generated/inject-js/firebolt-inject.d.ts .`

**Alternative considered:** Ignore the entire package folder - rejected because it would lose important hand-authored configuration and documentation.

### 4. Implementation Approach
**Decision:** Add patterns to `.gitignore` and unstage existing generated files without deleting them from the working directory.

**Rationale:** This approach preserves the files for local development while preventing future commits. The `git restore --staged generated/` command unstages files without removing them from the working directory.

**Alternative considered:** Delete generated files entirely - rejected because it would break local development and require immediate regeneration.

## Risks / Trade-offs

### Risk: Loss of Historical API Contract Tracking
**Risk:** Excluding generated files from git could make it harder to track API contract evolution over time.

**Mitigation:** The source OpenRPC contracts and OpenSpec specs remain tracked in git, providing the definitive source of API contracts. Generated files can be regenerated at any point to see the contract state for a given commit.

### Risk: CI/CD Workflow Dependencies
**Risk:** CI/CD workflows might depend on generated files being present in the repository.

**Mitigation:** Reviewed GitHub workflows (ci.yml, release.yml) and found no direct references to the generated folder. The workflows use build processes that generate files as needed.

### Trade-off: Repository Size vs. Historical Tracking
**Trade-off:** We're choosing reduced repository size and commit noise over the ability to see historical generated file states directly in git history.

**Rationale:** The source contracts provide the authoritative API history, and generated files can be regenerated. The benefits of reduced repository size and cleaner commit history outweigh the minor inconvenience of regenerating files for historical analysis.

## Migration Plan

1. **Update .gitignore**
   - Add `generated/*` pattern to root `.gitignore`
   - Add `firebolt-inject.d.ts` pattern to root `.gitignore`

2. **Unstage Generated Files**
   - Run `git restore --staged generated/` to unstage all generated files
   - Run `git restore --staged firebolt-inject.d.ts` to unstage the root-level type file

3. **Verification**
   - Run `git status` to confirm generated files are unstaged
   - Run `npm run generate` to verify generation still works
   - Run `cd package && npm run build` to verify package build process still works
   - Verify CI/CD workflows remain unaffected

4. **Communication**
   - Document the change in commit message
   - Update any relevant documentation if needed

## Open Questions

None - the approach is straightforward and all decisions are clear.