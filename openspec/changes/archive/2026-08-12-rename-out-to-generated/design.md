## Context

The current codebase uses `out/` as the default output directory for generated language bindings. This directory contains:
- TypeScript declaration files (.d.ts)
- Kotlin/JS files (.kt) 
- C++ headers (.hpp)
- Python type stubs (.pyi) and protocol files (.py)
- ReScript bindings (.res)
- Inject JS bundle (inject-js/firebolt-inject.js)

These files are currently checked into the repository and serve as versioned API contracts. The name "out" is semantically misleading because it conventionally denotes ephemeral build artifacts, whereas these files are intended to be persisted and versioned.

## Goals / Non-Goals

**Goals:**
- Rename the default output directory from "out" to "generated" to better reflect its purpose
- Update all code, documentation, and test references to use the new directory name
- Maintain backward compatibility where feasible through the `--outdir` CLI option
- Ensure all generated files remain versioned in the repository

**Non-Goals:**
- Changing the fundamental generation pipeline or AST structure
- Modifying the content or format of generated files
- Altering the CLI's `--outdir` option functionality
- Changing which files are generated or their internal structure

## Decisions

### 1. Directory Rename Strategy
**Decision:** Rename the directory using `git mv` to preserve file history
**Rationale:** Using `git mv` ensures that the git history for each generated file is preserved, which is important for tracking changes to the API contracts over time. This is preferable to deleting and recreating files, which would lose historical context.

**Alternative considered:** Delete `out/` and regenerate into `generated/` - rejected because it would lose git history and make it harder to track API evolution.

### 2. Default CLI Parameter Change
**Decision:** Change the default `--outdir` value from `"out"` to `"generated"` in `src/cli.ts`
**Rationale:** This ensures that new users and existing scripts get the semantically correct default behavior. The `--outdir` option remains available for users who need the old location for backward compatibility.

**Alternative considered:** Keep default as "out" and document users should use `--outdir generated` - rejected because it doesn't address the reviewer's concern about the misleading default name.

### 3. Documentation Update Scope
**Decision:** Update all current documentation references but preserve archived change documents as-is
**Rationale:** Current documentation (README, active specs) should reflect the new reality for accuracy. Archived change documents represent historical decisions and should be preserved as-is to maintain historical accuracy, even if they reference the old directory name.

**Alternative considered:** Update all references including archived documents - rejected because it would historically inaccurate and archived documents are not actively used.

### 4. Test File Updates
**Decision:** Update test file path references to use the new directory name
**Rationale:** Tests that validate output at specific paths need to match the new directory structure to pass. This includes inject-js tests, consistency tests, and infrastructure tests.

### 5. CI/CD Workflow Updates
**Decision:** Review and update GitHub workflow files if they reference the output directory
**Rationale:** CI/CD workflows may reference the output directory for artifact uploading, validation, or other purposes. These need to be updated to match the new directory structure.

## Risks / Trade-offs

### Risk: Breaking Change for Existing Users
**Risk:** Users relying on the default "out" directory will have their workflows break
**Mitigation:** The `--outdir out` option remains available for backward compatibility. Document the migration path clearly in the commit message and release notes.

### Risk: Incomplete Reference Updates
**Risk:** Some documentation or code references to "out/" may be missed, leading to confusion
**Mitigation:** Use comprehensive grep searches to find all references. Update the proposal to include a verification step to run the generator and ensure all output goes to the correct location.

### Risk: Git History Complexity
**Risk:** The directory rename could complicate git history for some operations
**Mitigation:** Using `git mv` minimizes this risk. The benefits of semantic clarity outweigh the minor git history complexity.

### Trade-off: Semantic Clarity vs. Backward Compatibility
**Trade-off:** We're choosing semantic clarity over complete backward compatibility
**Rationale:** The current default is misleading and the reviewer's feedback indicates this causes confusion. The breaking change is one-time and easily mitigated with the `--outdir` option.

## Migration Plan

1. **Code Changes**
   - Update `src/cli.ts` default `--outdir` parameter
   - Update test file path references in generator test files
   - Verify no other source files reference the old directory name

2. **Directory Rename**
   - Use `git mv out generated` to rename the directory
   - Verify all files moved correctly with history preserved

3. **Documentation Updates**
   - Update README.md output path table and architecture diagrams
   - Update OpenSpec specs (firebolt-cli, header-generation, wpe-inject-js-generator)
   - Review and update CI/CD workflow files if needed

4. **Verification**
   - Run `npx ts-node src/cli.ts generate` and verify output goes to `generated/`
   - Run test suite to ensure all tests pass with new paths
   - Verify git history is preserved for moved files

5. **Communication**
   - Include clear migration notes in commit message
   - Document the breaking change in release notes
   - Update any external documentation if applicable

## Open Questions

None - the approach is straightforward and all decisions are clear.