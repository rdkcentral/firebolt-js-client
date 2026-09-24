## Context

**Current State:**
The `openspec/specs/` directory currently contains 17 subdirectories mixing two different spec types:
- **API specs** (11): accessibility, actions, advertising, device, discovery, display, lifecycle2, localization, metrics, network, shared, video-output
- **Generator specs** (4): ast-builder, firebolt-cli, header-generation, wpe-inject-js-generator
- **Meta specs** (1): _meta (guidelines and conventions)

**Problems:**
1. Spec reader (`src/generators/spec-reader.ts`) attempts to load all specs using the same YAML frontmatter validation
2. Generator specs use Gherkin-style requirements format without YAML frontmatter, causing validation failures
3. Inconsistent naming conventions (kebab-case vs expected PascalCase conversion)
4. `shared` module lacks required `platform` field, causing validation errors
5. No clear separation between API specifications and generator tool specifications

**Constraints:**
- No backward compatibility needed (internal tooling only)
- Must follow OpenSpec folder conventions (kebab-case directories)
- Must maintain Firebolt naming conventions (PascalCase module names in generators)
- Tests are currently failing due to spec reader errors

## Goals / Non-Goals

**Goals:**
- Separate API specs from generator specs into distinct directories
- Update spec reader to only load API specs from `api/` subdirectory
- Handle `shared` module as special case (optional `platform` field)
- Update all documentation references to new directory structure
- Fix failing tests caused by spec reader validation errors
- Align with OpenSpec conventions for folder organization

**Non-Goals:**
- Changing spec file formats or content
- Modifying generator logic or AST structure
- Changing Firebolt API surface or generated headers
- Creating new spec types or capabilities
- Maintaining backward compatibility with old directory structure

## Decisions

### 1. Directory Structure

**Decision:** Use three-tier structure under `openspec/specs/`:
- `api/` - Firebolt API module specs only
- `generator/` - Generator tool requirements specs only  
- `_meta/` - Meta guidelines and conventions (existing)
- `_meta/shared/` - Generic shared types/conventions across both domains

**Rationale:** Clear separation of concerns, follows OpenSpec conventions, prevents spec reader from attempting to parse generator specs. The `_meta/shared/` location allows for truly generic shared patterns that apply to both API and generator specs, while `api/shared/` contains Firebolt-specific cross-module types.

**Alternatives considered:**
- Single directory with spec type marker: Rejected due to complexity and potential for misclassification
- File extension convention: Rejected as less explicit and harder to enforce
- Prefix-based naming: Rejected as less clean than directory separation

### 2. Directory Naming Convention

**Decision:** Keep kebab-case for directories (OpenSpec convention), convert to PascalCase in generators.

**Rationale:** OpenSpec uses kebab-case for directories (e.g., `video-output`, `lifecycle2`). The existing spec reader already converts `video-output` → `VideoOutput`. This maintains consistency with OpenSpec standards while preserving Firebolt's PascalCase module naming convention in generated code.

**Alternatives considered:**
- Enforce PascalCase directories: Rejected as breaks OpenSpec convention
- Use camelCase directories: Rejected as inconsistent with OpenSpec

### 3. Shared Module Handling

**Decision:** Place Firebolt-specific shared types in `api/shared/` and make `platform` field optional only for this module.

**Rationale:** The `shared` module contains Firebolt-specific cross-module types (ListenResponse, FireboltError, AgePolicy) that are consumed by the API generation pipeline. Making `platform` optional for this specific module acknowledges its special role as cross-module infrastructure while maintaining the requirement for all other API modules.

**Alternatives considered:**
- Move to `_meta/shared/`: Rejected as these are Firebolt-specific types, not generic conventions
- Add `platform: both` field: Rejected as the shared module is not platform-specific
- Remove shared module entirely: Rejected as it's essential for cross-module type references

### 4. Spec Reader Implementation

**Decision:** Update `spec-reader.ts` to:
1. Read from `openspec/specs/api/` instead of `openspec/specs/`
2. Skip `_meta` and `generator` directories entirely
3. Make `platform` field validation optional for `shared` module only
4. Keep existing kebab-case → PascalCase conversion logic

**Rationale:** Clean separation of concerns, minimal code changes, maintains existing conversion logic that works well.

**Alternatives considered:**
- Add spec type detection: Rejected as more complex than needed
- Support both old and new paths: Rejected as backward compatibility not needed

### 5. Documentation Updates

**Decision:** Update all meta documentation and archived changes to reflect new paths, but preserve historical context in archived changes.

**Rationale:** Ensures consistency across the codebase while maintaining historical accuracy in archived changes. Historical paths in archived changes should be noted as outdated rather than removed.

## Risks / Trade-offs

**Risk:** Breaking existing tooling or scripts that reference old spec paths
→ **Mitigation:** This is internal tooling with no external dependencies. All references are within the codebase and can be updated in one change.

**Risk:** Test failures due to path updates
→ **Mitigation:** Update all test files to use new directory structure as part of this change. Run full test suite after implementation.

**Risk:** Confusion about which shared directory to use
→ **Mitigation:** Clear documentation in `spec-format.md` explaining the distinction between `api/shared/` (Firebolt types) and `_meta/shared/` (generic conventions).

**Trade-off:** Additional directory depth (`api/` subdirectory) for better organization
→ **Justification:** The clarity and separation benefits outweigh the minor inconvenience of deeper directory nesting.

## Migration Plan

**Steps:**
1. Create new directory structure (`api/`, `generator/`, `_meta/shared/`)
2. Move API spec directories to `api/` subdirectory
3. Move generator spec directories to `generator/` subdirectory
4. Create `_meta/shared/spec.md` for generic shared content (if needed)
5. Update `spec-reader.ts` to read from `api/` subdirectory
6. Add optional `platform` field validation for `shared` module
7. Update `spec-format.md` with new directory structure
8. Update `openrpc-derivation.md` path references
9. Update `generator-conventions.md` path references
10. Update `config.yaml` path references
11. Update archived change documentation (note historical paths)
12. Update test files to use new directory structure
13. Run full test suite to verify changes
14. Clean up old empty directories if any

**Rollback Strategy:** Git revert if issues arise. Since this is a structural reorganization with no API changes, rollback is straightforward.

## Open Questions

None identified. The scope is well-defined as a structural reorganization with clear implementation steps.