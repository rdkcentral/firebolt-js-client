## Why

App developers using the Firebolt SDK need VS Code intellisense, API documentation, and type safety when developing applications. Currently, the inject-js generator produces a JavaScript bundle but lacks corresponding TypeScript definitions that match the factory/builder pattern. This creates a poor developer experience where developers must work without IDE support, leading to slower development and more errors.

## What Changes

- Create a new full-AST generator (`inject-js-types.ts`) that produces a single `firebolt-inject.d.ts` file matching the inject-js factory/builder pattern
- The generator will combine existing per-module type definitions into a unified TypeScript definition file
- Add npm package configuration for publishing `@firebolt-js/types` to GitHub Packages
- Create a Firebolt type reference app in the `references/` folder for manual IDE validation
- Add automated tests for generator output validation and package installation

## Capabilities

### New Capabilities
- `inject-js-types-generator`: TypeScript definition generator that produces a single `.d.ts` file for the inject-js factory/builder pattern, enabling IDE intellisense and API documentation for app developers

### Modified Capabilities
- None (this is a new generator, existing per-module `.d.ts` generation remains unchanged)

## Impact

- **New generator**: `src/generators/inject-js-types.ts` - full-AST generator targeting web platform
- **New package**: `@firebolt-js/types` npm package for GitHub Packages distribution
- **Reference materials**: `references/firebolt-type-reference-app/` - validation app with dev dependency usage
- **Build process**: Updated package.json with npm publishing configuration
- **Testing**: New generator tests and automated installation validation
- **Backward compatibility**: Existing per-module `.d.ts` files continue to work for current users