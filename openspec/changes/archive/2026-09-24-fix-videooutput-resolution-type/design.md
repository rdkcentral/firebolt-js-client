## Context

The VideoOutput module currently has a spec mismatch where VideoResolution is defined as a string in both the OpenSpec spec and OpenRPC schema, but the original design intent (from archived spec 2026-06-01-add-rdk9-web-apis) was for it to be an object with `width: unsigned` and `height: unsigned` properties.

This mismatch causes the AST builder to create a `ScalarAliasDecl` for VideoResolution, which language generators don't handle. All 5 generators (TypeScript, Kotlin, C++, Python, ReScript) emit `// [unsupported TypeDecl kind: scalar-alias]` comments and reference an undefined `VideoResolution` type in method signatures, causing type-checking failures.

## Goals / Non-Goals

**Goals:**
- Fix the VideoResolution type definition to match the original object-with-width-height design
- Eliminate the scalar-alias emission issue without requiring generator changes
- Restore type-checking across all language generators

**Non-Goals:**
- Implementing scalar-alias or array-alias emission in generators
- Changing the API surface or method signatures
- Adding validation constraints to the VideoResolution type

## Decisions

### Decision 1: Fix spec rather than implement scalar-alias handling

**Choice:** Update the spec and OpenRPC to use object type instead of implementing scalar-alias emission in generators.

**Rationale:**
- The original design intent was clearly for VideoResolution to be an object with width/height properties
- Generators already handle ObjectTypeDecl correctly, so no generator code changes needed
- Simpler to fix the root cause (spec mismatch) than to add complexity to 5 generators
- Aligns with the archived spec from 2026-06-01-add-rdk9-web-apis

**Alternatives considered:**
- Implement scalar-alias emission in all 5 generators: Rejected as unnecessary complexity
- Remove VideoResolution type entirely and inline strings: Rejected as loses semantic information

### Decision 2: Spec → OpenRPC → AST → Generated Code Flow

**Current (broken) flow:**
```
OpenSpec spec: VideoResolution = { resolution: string }
           ↓
OpenRPC schema: { "type": "string" }
           ↓
AST: ScalarAliasDecl { kind: "scalar-alias", target: PrimitiveRef { primitive: "string" } }
           ↓
Generators: emitTypeDecl() → // [unsupported TypeDecl kind: scalar-alias]
           ↓
Generated code: function resolution(): Promise<VideoResolution> ← undefined type
```

**Fixed flow:**
```
OpenSpec spec: VideoResolution = { width: unsigned, height: unsigned }
           ↓
OpenRPC schema: { "type": "object", "properties": { "width": {"type": "unsigned"}, "height": {"type": "unsigned"} } }
           ↓
AST: ObjectTypeDecl { kind: "object", properties: [ { name: "width", type: PrimitiveRef { primitive: "unsigned" } }, { name: "height", type: PrimitiveRef { primitive: "unsigned" } } ] }
           ↓
Generators: emitTypeDecl() → emitObject() → interface/struct/class with width/height fields
           ↓
Generated code: function resolution(): Promise<VideoResolution> ← properly defined type
```

## Risks / Trade-offs

**Risk:** The examples in the current spec show string values like "3840x2160" which won't match the new object structure.

**Mitigation:** Update the examples in the spec to use object format: `{ width: 3840, height: 2160 }`

**Trade-off:** This is technically a breaking change for anyone who was treating VideoResolution as a string, but since the generated code was already broken (undefined type), there's no functional impact on working code.
