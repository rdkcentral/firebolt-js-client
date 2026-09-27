## Why

The VideoResolution type in the VideoOutput module has a spec mismatch that causes type-checking failures across all language generators. The original archived spec (2026-06-01-add-rdk9-web-apis) defined VideoResolution as an object with `width: unsigned` and `height: unsigned` properties, but the current spec and OpenRPC have it as a simple string. This causes the AST builder to create a ScalarAliasDecl which generators don't handle, resulting in undefined type references in generated code.

## What Changes

- Update `openspec/specs/api/video-output/spec.md` to define VideoResolution as an object type with `width: unsigned` and `height: unsigned` properties
- Update `src/openrpc/video-output.json` to use an object schema with width/height properties instead of `type: "string"`
- This will cause the AST builder to create ObjectTypeDecl instead of ScalarAliasDecl
- Generators already handle ObjectTypeDecl, so no generator changes needed

## Capabilities

### New Capabilities
None

### Modified Capabilities

- `video-output`: The VideoResolution type definition is changing from a string to an object with width and height properties to match the original design intent

## Impact

- Fixes type-checking failures across TypeScript, Kotlin, C++, Python, and ReScript generators
- Aligns implementation with original design intent from archived spec
- No breaking changes to the API surface (method signatures remain the same, only internal type representation changes)
- Resolves the scalar-alias emission issue by eliminating the need for scalar-alias handling in generators
