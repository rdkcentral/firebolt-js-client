## Context

The current TypeScript definition generator (`src/generators/inject-js-types.ts`) generates a single `firebolt-inject.d.ts` file that provides type definitions for the Firebolt JavaScript client. The generator uses the Canonical AST (derived from OpenRPC documents) to emit TypeScript definitions.

**Current State:**
- Module namespaces are generated with type definitions and method signatures
- FireboltClient interface uses `typeof Firebolt.ModuleName` pattern for module references
- Basic JSDoc is generated from AST descriptions and constraint information
- Limited example generation based on parameter names and types

**Problem:**
The `typeof Firebolt.ModuleName` pattern doesn't provide good intellisense because it returns the type of the namespace object rather than an interface describing the module's callable methods. When developers type `firebolt.Localization.` in VS Code, they don't see method suggestions.

**Constraints:**
- AST structure should remain unchanged (Option B approach: generator-specific spec reading)
- No breaking changes to existing namespace structure
- Must maintain backward compatibility
- Generator should work with existing spec.md file format

## Goals / Non-Goals

**Goals:**
- Generate explicit module interfaces (e.g., `LocalizationModule`) with full method signatures
- Update FireboltClient to use module interfaces for excellent intellisense
- Enhance JSDoc with comprehensive information from spec files (descriptions, since versions, examples, constraints)
- Create spec reader utility to extract metadata from spec.md files
- Maintain backward compatibility with existing namespace structure

**Non-Goals:**
- Changing the AST structure or adding new AST node types
- Modifying the spec.md file format
- Breaking existing type definitions or namespaces
- Changes to other language generators (TypeScript .d.ts only)

## Decisions

### Decision 1: Generator-Specific Spec Reading (Option B)

**Choice:** Create a spec reader utility that directly reads spec.md files, rather than extending the AST with documentation metadata.

**Rationale:**
- Keeps the AST focused on type information (its primary purpose)
- Less invasive to the existing AST structure and builder
- Other generators may not need the same documentation metadata
- Spec reading is specific to TypeScript definition generation needs
- Easier to maintain separation of concerns (AST = types, specs = documentation)

**Alternatives Considered:**
- **Option A (Extend AST):** Add `since`, `examples`, `description`, `version`, `stability` fields to AST nodes
  - *Rejected:* More invasive, requires AST builder changes, all generators would need to handle new fields even if they don't use them

### Decision 2: Module Interface Naming Convention

**Choice:** Use `Firebolt.ModuleNameModule` pattern (e.g., `Firebolt.LocalizationModule`)

**Rationale:**
- Keeps everything under the Firebolt namespace for consistency
- Clear association with the corresponding module namespace
- Matches existing namespace pattern
- Not overly verbose while being descriptive

**Alternatives Considered:**
- **Top-level interfaces:** `LocalizationModule` (without Firebolt prefix)
  - *Rejected:* Less namespaced, potential naming conflicts
- **Separate namespace:** `Firebolt.Modules.LocalizationModule`
  - *Rejected:* More verbose than necessary

### Decision 3: JSDoc Enhancement Scope

**Choice:** Include all available spec metadata in JSDoc: `@since`, `@platform`, detailed `@param`, enhanced `@returns`, multiple `@example` blocks

**Rationale:**
- Maximizes developer experience with comprehensive documentation
- Leverages rich information already available in spec files
- Provides context for API usage and evolution
- Examples with descriptions help developers understand usage patterns

**Alternatives Considered:**
- **Minimal JSDoc:** Only add basic examples
  - *Rejected:* Doesn't fully utilize available spec information
- **Manual override system:** Allow specs to provide custom JSDoc
  - *Rejected:* Adds complexity to spec format; automatic generation is sufficient

### Decision 4: Error Handling Strategy

**Choice:** Graceful degradation with warnings when spec data is missing

**Rationale:**
- Generator should continue working even if spec files are missing or incomplete
- Warnings alert developers to missing data without breaking the build
- Fallback to AST data ensures basic functionality always works

**Alternatives Considered:**
- **Fail fast:** Throw errors when spec data is missing
  - *Rejected:* Too restrictive; would break builds for missing spec files
- **Silent fallback:** Use AST data silently without warnings
  - *Rejected:* Developers wouldn't know they're missing enhanced documentation

## Data Flow: Spec to Generated Code

**Example: Localization.country() method**

```
1. Spec File (openspec/specs/api/localization/spec.md):
   properties:
     - name: country
       description: Returns the country setting
       since: "8.0.0"
       result:
         type: string
         description: ISO 3166-1 alpha-2 country code
       examples:
         - description: Country is United States
           result: "US"

2. OpenRPC Derivation (automated):
   - Converts spec to OpenRPC JSON format
   - Preserves descriptions, examples in OpenRPC extensions

3. Canonical AST (from OpenRPC):
   Module: Localization
     Method: country
       kind: "call"
       description: "Returns the country setting"
       params: []
       result: { kind: "primitive", primitive: "string" }

4. Spec Reader (new utility):
   - Reads spec.md file directly
   - Extracts: since="8.0.0", examples, enhanced descriptions

5. Enhanced Generator (modified inject-js-types.ts):
   - Generates module interface:
     interface LocalizationModule {
       /** Returns the country setting
        * @since 8.0.0
        * @platform both
        * @returns Promise<string> - ISO 3166-1 alpha-2 country code
        * @example
        * Country is United States
        * const country = await firebolt.Localization.country();
        */
       country(): Promise<string>;
     }
   - Updates FireboltClient:
     interface FireboltClient {
       Localization: LocalizationModule;  // Instead of typeof Firebolt.Localization
     }

6. Generated Output (firebolt-inject.d.ts):
   - Contains both namespace (for direct usage) and module interface (for intellisense)
   - FireboltClient uses module interface for excellent IDE support
```

## Risks / Trade-offs

### Risk 1: Spec File Format Changes

**Risk:** Future changes to spec.md format could break the spec reader utility.

**Mitigation:**
- Spec reader focuses on stable YAML frontmatter structure
- Add validation and clear error messages for parsing failures
- Keep spec reader simple and focused on needed fields only
- Monitor spec format changes and update reader accordingly

### Risk 2: Performance Impact

**Risk:** Reading spec files for every module could slow down generation.

**Mitigation:**
- Load all spec files once at generator startup (single pass)
- Cache parsed spec data in memory during generation
- Spec files are small (typically <10KB each), so impact is minimal
- Generation is already a build-time operation, not runtime

### Risk 3: Spec-Generator Coupling

**Risk:** Generator becomes tightly coupled to spec file structure.

**Mitigation:**
- Spec reader is a focused utility with clear interface
- Abstract spec reading behind functions that can be adapted
- Keep spec reader changes isolated from main generator logic
- Document spec format expectations clearly

### Trade-off: Code Duplication

**Trade-off:** Module interfaces duplicate method signatures from namespaces.

**Rationale:**
- Duplication is mechanical (generated code, not manual)
- Ensures namespace and interface stay in sync
- Provides excellent intellisense that `typeof` cannot achieve
- Can add test to verify namespace/interface consistency if needed

## Migration Plan

**Deployment Steps:**
1. Implement spec reader utility (`src/generators/spec-reader.ts`)
2. Modify `inject-js-types.ts` generator to use spec data
3. Add module interface generation
4. Update FireboltClient to use module interfaces
5. Update tests to verify new structure
6. Run `npm run generate` to produce updated definitions
7. Copy generated file to package directory
8. Test with reference app to verify intellisense improvements

**Rollback Strategy:**
- Git revert of generator changes
- Regenerate with previous generator version
- No breaking changes to existing code, so rollback is safe

**Testing:**
- Unit tests for spec reader utility
- Integration tests for enhanced JSDoc generation
- Manual testing with VS Code to verify intellisense
- Reference app testing to ensure no runtime impact

## Open Questions

None at this time. The design is straightforward with clear implementation path based on existing spec file structure and generator patterns.
