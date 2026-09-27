## Why

The current TypeScript definition generator uses `typeof Firebolt.ModuleName` for module references in the FireboltClient interface, which doesn't provide good intellisense for JavaScript applications. When developers type `firebolt.Localization.` in VS Code, they don't see the available methods because `typeof` returns the type of the namespace object rather than an interface describing the module's methods and properties. Additionally, the current JSDoc examples are limited and don't leverage the rich information available in the spec files (descriptions, since versions, examples, constraints).

## What Changes

- **Generate explicit module interfaces**: Create dedicated interfaces (e.g., `LocalizationModule`) that describe each module's methods and properties with full type information
- **Replace typeof pattern**: Update FireboltClient interface to use module interfaces instead of `typeof Firebolt.ModuleName` for better intellisense
- **Enhanced JSDoc generation**: Add comprehensive JSDoc documentation including:
  - `@since` tags from spec version information
  - `@platform` tags for platform-specific APIs
  - Detailed `@param` descriptions from spec parameter descriptions
  - Enhanced `@returns` tags with result type descriptions
  - Multiple `@example` blocks using spec examples with descriptions
  - Usage notes and constraints from spec data
- **Spec reader utility**: Create a utility to read spec.md files and extract metadata (descriptions, since versions, examples) for JSDoc generation

## Capabilities

### New Capabilities
- `inject-js-types-generator-enhancements`: Enhanced TypeScript definition generator with module interfaces and comprehensive JSDoc documentation

### Modified Capabilities
- None (this is a generator improvement, not an API behavior change)

## Impact

- **Generator code**: Modifications to `src/generators/inject-js-types.ts` to generate module interfaces and enhanced JSDoc
- **New utility**: Addition of `src/generators/spec-reader.ts` for reading spec.md files
- **Generated output**: Changes to `generated/inject-js/firebolt-inject.d.ts` structure (module interfaces added, FireboltClient updated)
- **Developer experience**: Significantly improved intellisense and documentation for JavaScript/TypeScript app developers using Firebolt APIs
- **No breaking changes**: Existing namespace structure remains for backward compatibility; module interfaces are additional
