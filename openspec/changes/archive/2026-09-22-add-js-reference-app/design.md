## Context

The project currently has a TypeScript reference app (`references/firebolt-type-reference-app/`) that demonstrates how to use the generated Firebolt type definitions with TypeScript. This app requires TypeScript compilation, a build step, and uses TypeScript-specific syntax. However, the generated type definitions (`.d.ts` files) also work with plain JavaScript through JSDoc annotations and VS Code's JavaScript language server. There is currently no demonstration of this capability.

## Goals / Non-Goals

**Goals:**
- Create a JavaScript reference app that demonstrates type safety with plain JavaScript
- Show that the generated type definitions work with JSDoc annotations
- Provide a simpler onboarding path for JavaScript developers who don't use TypeScript
- Maintain parity with the TypeScript reference app in terms of examples covered

**Non-Goals:**
- Modifying the existing TypeScript reference app
- Changing the type definition generation pipeline
- Adding new API capabilities or modifying existing ones
- Creating a mock transport implementation (the JS app will rely on the same global FireboltServiceManager pattern)

## Decisions

**Directory Structure:**
- Create `references/firebolt-js-reference-app/` as a sibling to the existing TypeScript app
- This keeps both reference implementations discoverable and allows easy comparison
- Follows the existing project convention for reference implementations

**No Build Step:**
- The JavaScript app will load `src/main.js` directly in the browser without compilation
- This demonstrates the key advantage: edit and reload without a build step
- Uses `jsconfig.json` for VS Code type checking instead of TypeScript compilation

**JSDoc Type Annotations:**
- Use `/** @type {import("@firebolt-js/types").FireboltClient} */` pattern for type annotations
- This is the standard VS Code/JavaScript language server pattern for importing types
- Leverages the existing JSDoc comments already embedded in the generated `.d.ts` files

**Same Examples:**
- Adapt the same examples from `references/firebolt-type-reference-app/src/main.ts`
- This allows direct comparison between TypeScript and JavaScript approaches
- Ensures feature parity between both reference implementations

**Package Configuration:**
- No TypeScript dependency in `package.json`
- No build scripts in `package.json`
- Only `@firebolt-js/types` as a dev dependency (for the type definitions)
- This keeps the JavaScript app lightweight and focused

## Risks / Trade-offs

**Risk: JavaScript developers might not know about JSDoc type annotations**
- Mitigation: The README will clearly explain the JSDoc pattern and provide examples
- The inline examples in the code will serve as documentation

**Risk: VS Code IntelliSense might not work as well as with TypeScript**
- Mitigation: The `jsconfig.json` will be configured with `checkJs: true` and proper `typeRoots`
- Testing will verify that IntelliSense, hover documentation, and type checking work correctly

**Trade-off: Less runtime type safety than TypeScript**
- JavaScript with JSDoc provides compile-time (IDE-time) type checking but no runtime enforcement
- This is acceptable for a reference app focused on demonstrating type definition usage
- The README will clarify this distinction

**Trade-off: More verbose type annotations than TypeScript**
- JSDoc requires comment-based type annotations which are more verbose than TypeScript's native syntax
- This is a known limitation of JavaScript type checking and is documented in the README
- The trade-off is acceptable for developers who prefer plain JavaScript over TypeScript
