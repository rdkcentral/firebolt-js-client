## Context

Current OpenSpec spec files use nested YAML objects for API definitions. For example, properties are defined as:

```yaml
properties:
  audioDescription:
    description: Returns the audio description setting
    result:
      type: bool
```

This structure renders poorly in GitHub Preview as horizontal nested blocks. The Firebolt JS client is not yet in production, making this an ideal time to improve the spec format without breaking existing consumers.

## Goals / Non-Goals

**Goals:**
- Improve GitHub Preview rendering of spec files with vertical, scannable structure
- Maintain semantic equivalence between old and new formats
- Ensure end-to-end pipeline validation (spec → OpenRPC → AST → generated headers)
- Update all meta-guidelines to reflect the new format

**Non-Goals:**
- Changes to the Canonical AST structure
- Changes to language generators
- Changes to generated header output
- Changes to runtime behavior

## Decisions

### Decision 1: Use YAML Arrays with Explicit `name:` Fields

**Rationale:** Arrays render better in GitHub Preview as vertical list items. Explicit `name:` fields make the structure clearer and match the pattern already used for `params:` in actions/events.

**Example transformation:**

**Before (nested objects):**
```yaml
properties:
  audioDescription:
    description: Returns the audio description setting
    since: "8.0.0"
    result:
      type: bool
  closedCaptionsSettings:
    description: Returns captions settings
    since: "8.0.0"
    result:
      $ref: "#/types/ClosedCaptionsSettings"
```

**After (arrays with explicit names):**
```yaml
properties:
  - name: audioDescription
    description: Returns the audio description setting
    since: "8.0.0"
    result:
      type: bool
  - name: closedCaptionsSettings
    description: Returns captions settings
    since: "8.0.0"
    result:
      $ref: "#/types/ClosedCaptionsSettings"
```

**Alternatives considered:**
- Markdown tables: Better rendering but requires parser changes and moves away from YAML frontmatter
- Keep current format: Poor GitHub rendering, difficult to scan

### Decision 2: Apply Array Syntax to All API Definition Sections

**Rationale:** Consistency across the spec format. All sections (properties, actions, events, types) will use the same array pattern.

**Sections affected:**
- `properties:` - Array of property definitions
- `actions:` - Array of action definitions  
- `events:` - Array of event definitions
- `types:` - Array of type definitions
- Nested `properties:` within object types - Array of field definitions
- `params:` within actions/events - Already uses arrays (no change needed)

### Decision 3: Update Meta-Guidelines Before Converting Specs

**Rationale:** Establish the new format standard first, then convert existing specs to match. This ensures consistency and provides reference documentation.

**Order of operations:**
1. Update `openspec/specs/_meta/spec-format.md` with array syntax examples
2. Update `openspec/specs/_meta/openrpc-derivation.md` with array-based derivation rules
3. Convert all spec files to match the new format
4. Validate end-to-end pipeline

## Pipeline Impact: Spec → OpenRPC → AST → Generated Code

### Example: Accessibility.audioDescription Property

**Current Spec (object syntax):**
```yaml
properties:
  audioDescription:
    description: Returns the audio description setting of the device.
    since: "8.0.0"
    result:
      type: bool
```

**New Spec (array syntax):**
```yaml
properties:
  - name: audioDescription
    description: Returns the audio description setting of the device.
    since: "8.0.0"
    result:
      type: bool
```

**Derived OpenRPC (unchanged):**
```json
{
  "name": "Accessibility.audioDescription",
  "summary": "Get the audio description setting.",
  "params": [],
  "result": {
    "name": "result",
    "schema": { "type": "boolean" }
  }
}
```

**Canonical AST (unchanged):**
```typescript
{
  name: "audioDescription",
  kind: "call",
  params: [],
  result: { kind: "primitive", primitive: "bool" },
  description: "Returns the audio description setting of the device."
}
```

**Generated TypeScript (unchanged):**
```typescript
export namespace Accessibility {
  export function audioDescription(): Promise<boolean>;
}
```

**Key insight:** The format change only affects the spec layer. OpenRPC derivation extracts the `name` field instead of the object key, but produces identical OpenRPC, AST, and generated code.

## Risks / Trade-offs

### Risk 1: AI Derivation Process May Not Handle Array Syntax

**Mitigation:** Update `openspec/specs/_meta/openrpc-derivation.md` with explicit array-based derivation rules. Test with AI-assisted derivation on a sample spec before full conversion.

### Risk 2: Manual Conversion Errors Across 15+ Spec Files

**Mitigation:** Create a systematic conversion script or checklist. Validate each converted spec by:
- Running the full pipeline (spec → OpenRPC → AST → generated headers)
- Comparing generated output before/after conversion
- Ensuring all tests pass

### Risk 3: Inconsistent Application of New Format

**Mitigation:** Update meta-guidelines first to establish the standard. Use the updated `spec-format.md` as the reference during conversion.

### Trade-off: More Verbose Syntax

**Impact:** Array syntax with explicit `name:` fields is more verbose than object keys.

**Mitigation:** The improved readability and GitHub rendering justify the verbosity. The explicit structure also makes diffs clearer.

## Migration Plan

1. **Update meta-guidelines**
   - Modify `openspec/specs/_meta/spec-format.md` with array syntax examples
   - Modify `openspec/specs/_meta/openrpc-derivation.md` with array-based derivation rules

2. **Convert spec files systematically**
   - Start with a simple spec (e.g., Network) as a proof of concept
   - Validate the full pipeline for the converted spec
   - Convert remaining specs one by one, validating each

3. **End-to-end validation**
   - For each converted spec: generate OpenRPC → AST → all language headers
   - Compare generated output with pre-conversion baseline
   - Run all existing tests to ensure no regressions

4. **Rollback strategy**
   - Git provides natural rollback if issues arise
   - Since the JS client is not in production, there's minimal deployment risk

## Open Questions

None identified at this time. The design is straightforward: a mechanical format change with clear migration path and validation strategy.