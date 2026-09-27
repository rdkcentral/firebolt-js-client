## Why

The existing TypeScript reference app demonstrates type safety with TypeScript, but doesn't show that the generated type definitions work with plain JavaScript development. JavaScript developers who don't use TypeScript need to see that they can still get IntelliSense and type checking through JSDoc annotations and jsconfig.json. This lowers the barrier to entry and demonstrates the versatility of the type definitions.

## What Changes

- Create new directory `references/firebolt-js-reference-app/` alongside the existing TypeScript reference app
- Add `src/main.js` with JavaScript examples using JSDoc type annotations (adapted from the TypeScript version)
- Add `jsconfig.json` for VS Code type checking and IntelliSense configuration
- Add `package.json` without TypeScript dependency and no build step
- Add `index.html` similar to the TypeScript version, but loading `src/main.js` directly
- Add `README.md` adapted from the TypeScript version, focused on JavaScript usage patterns

## Capabilities

### New Capabilities
None - this is a developer tooling/documentation change, not an API capability change.

### Modified Capabilities
None - no API requirements are being modified.

## Impact

- New reference implementation for JavaScript developers
- No changes to existing type definitions or generation pipeline
- No changes to the existing TypeScript reference app
- Adds a new developer onboarding path for users who prefer plain JavaScript over TypeScript
