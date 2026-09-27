## Context

The Firebolt JS Client follows a strict pipeline: OpenSpec (human-authored) → OpenRPC (AI-derived) → AST (parsed) → Generated code (per-language). Currently, multiple modules have spec inconsistencies that propagate through this pipeline, causing incorrect type definitions and missing descriptions in generated code. These issues affect developers using TypeScript, Kotlin, C++, Python, and ReScript bindings.

The current state shows:
- Type mismatches between spec and intended behavior (e.g., intent as string vs object)
- Missing enum details and descriptions
- Incorrect parameter types (e.g., progress as single type instead of conditional types)
- Incomplete descriptions that are critical for developer understanding

## Goals / Non-Goals

**Goals:**
- Fix spec definitions across 8 modules (Accessibility, Actions, Device, Discovery, Display, Localization, Metrics, VideoOutput)
- Ensure type definitions accurately reflect intended API behavior
- Add comprehensive descriptions for all modified types and methods
- Maintain consistency across the spec → OpenRPC → AST → generated code pipeline
- Ensure all language generators produce correct type declarations

**Non-Goals:**
- No changes to the AST builder or generators (spec corrections should flow through existing pipeline)
- No new API surface changes (only corrections to existing definitions)
- No breaking changes to method signatures or behavior

## Decisions

### 1. Spec-First Approach
**Decision:** Fix issues at the OpenSpec level first, then propagate through OpenRPC derivation.

**Rationale:** The pipeline is designed to derive from human-authored specs. Fixing at the spec level ensures:
- Single source of truth
- Consistent propagation to all generators
- Human reviewable changes
- No need to modify multiple layers independently

**Alternative considered:** Fix directly in OpenRPC files. Rejected because this would break the derivation pipeline and make future updates error-prone.

### 2. Module-by-Module Updates
**Decision:** Update spec files module by module in dependency order, starting with shared types.

**Rationale:** Some modules may reference shared types. Updating in dependency order prevents reference errors and allows incremental validation.

**Order:** shared → accessibility → actions → device → discovery → display → localization → metrics → video-output

### 3. Type Definition Strategy
**Decision:** Use precise type definitions that match intended behavior, even if more complex.

**Examples:**
- `preferredLanguages`: `string[]` with specific constraints (ISO 639-2/B codes, empty array allowed)
- `progress`: Conditional type based on content type (VOD: 0-0.99, live: seconds)
- `intent`: JSON object type instead of string

**Rationale:** Accurate type definitions prevent runtime errors and provide better developer experience through IDE autocomplete and type checking.

### 4. Description Enhancement
**Decision:** Add comprehensive descriptions for all modified types, methods, and enum values.

**Rationale:** Descriptions are critical for:
- Developer understanding of API behavior
- Documentation generation
- Code completion tooltips
- Future AI-assisted development

### 5. Enum Value Documentation
**Decision:** Add detailed descriptions for each enum value, especially for deviceClass.

**Rationale:** Enum values like "ott", "stb", "tv" have specific hardware implications that developers need to understand for proper API usage.

## Spec → OpenRPC → AST → Emitted Code Chain

### Example: Actions.intent Parameter Correction

**Current (Incorrect) Spec:**
```yaml
intent:
  type: string
  description: Intent as string
```

**Current OpenRPC:**
```json
"intent": {
  "type": "string",
  "description": "Intent as string"
}
```

**Current AST:** ScalarAliasDecl for string type

**Generated TypeScript:** `intent: string`

**Fixed Spec:**
```yaml
intent:
  type: object
  description: Intent as JSON object
  properties:
    action:
      type: string
    data:
      type: object
```

**Derived OpenRPC:**
```json
"intent": {
  "type": "object",
  "description": "Intent as JSON object",
  "properties": {
    "action": {"type": "string"},
    "data": {"type": "object"}
  }
}
```

**New AST:** ObjectTypeDecl with properties

**Generated TypeScript:** 
```typescript
intent: {
  action: string;
  data?: Record<string, unknown>;
}
```

## Risks / Trade-offs

### Risk: OpenRPC Derivation Complexity
**Risk:** Some type corrections (e.g., conditional types for progress) may be complex to express in OpenRPC schema.

**Mitigation:** Use OpenRPC composition features and validate that the AST builder can handle the derived schema. Test with a single module first before applying to all.

### Risk: Generator Compatibility
**Risk:** Some type changes may not be supported by all generators equally.

**Mitigation:** The existing generators already handle object types, arrays, and enums. The changes are within current capabilities. Will verify by running `npm run generate` after spec updates.

### Risk: Description Drift
**Risk:** Descriptions may become inconsistent between spec and OpenRPC during derivation.

**Mitigation:** Review OpenRPC output after derivation to ensure descriptions are preserved correctly. Use the OpenRPC derivation tool's description preservation features.

### Trade-off: Spec Complexity vs Clarity
**Trade-off:** More precise type definitions increase spec complexity but improve developer experience.

**Decision:** Prioritize clarity and correctness over simplicity. Developers benefit more from accurate types than from simpler but incorrect ones.

## Migration Plan

1. **Phase 1: Spec Updates**
   - Update spec files module by module
   - Validate YAML syntax and structure
   - Review descriptions for completeness

2. **Phase 2: OpenRPC Derivation**
   - Run OpenRPC derivation tool for each updated module
   - Review derived OpenRPC for accuracy
   - Fix any derivation issues manually if needed

3. **Phase 3: AST Validation**
   - Parse updated OpenRPC files with AST builder
   - Verify AST node types are correct (ObjectTypeDecl vs ScalarAliasDecl)
   - Check for any parsing errors

4. **Phase 4: Generation Testing**
   - Run `npm run generate` to produce all language headers
   - Type-check generated TypeScript declarations
   - Verify generated code compiles for each language
   - Run existing test suite

5. **Phase 5: Rollback Strategy**
   - Git commits at each phase for easy rollback
   - Keep backup of original spec files
   - If critical issues found, revert to last known good state

## Open Questions

1. **Conditional Types in OpenRPC:** How should conditional types (e.g., progress for VOD vs live) be represented in OpenRPC schema? Need to verify OpenRPC derivation tool capabilities.

2. **ISO 639-2/B Validation:** Should the spec include runtime validation for ISO 639-2/B language codes, or is documentation sufficient?

3. **Empty List Behavior:** For Display.colorimetry and videoResolutions, should the spec explicitly state the empty list behavior, or is this implementation detail?