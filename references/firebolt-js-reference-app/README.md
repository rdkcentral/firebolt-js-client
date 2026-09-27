# Firebolt JavaScript Reference App

This is a reference application for testing the Firebolt type definitions with plain JavaScript. It demonstrates how to use the FireboltServiceManager global pattern with JSDoc type annotations and provides a realistic environment for manual IDE testing.

## Purpose

The reference app serves two purposes:

1. **Validation**: Test that the type definitions work correctly with plain JavaScript and JSDoc
2. **Examples**: Show JavaScript developers how to use the Firebolt SDK with type safety through JSDoc

## Installation

The app uses `@firebolt-js/types` as a dev dependency (as types are only needed during development):

```bash
cd references/firebolt-js-reference-app
npm install
```

## Manual IDE Testing

Open this project in VS Code to test the following IDE features:

### 1. Intellisense for Module Names
- Type `firebolt.` and verify that module names appear (Accessibility, Device, etc.)
- Only web/both platform modules should appear

### 2. Hover Documentation
- Hover over module names to see module descriptions
- Hover over method names to see method descriptions and parameter types
- Hover over parameters to see parameter descriptions

### 3. Autocomplete for Parameters
- When calling a method, press Ctrl+Space to see parameter suggestions
- Verify that parameter types match the expected types

### 4. Type Checking
- Try calling a method with incorrect parameter types
- Verify that VS Code shows type errors (via jsconfig.json)
- Try accessing a non-existent module or method
- Verify that VS Code shows appropriate errors

### 5. "Go to Definition" Navigation
- Right-click on a module name and select "Go to Definition"
- Verify that it navigates to the type definition in the `.d.ts` file
- Right-click on a method name and select "Go to Definition"
- Verify that it navigates to the method signature

## JSDoc Type Annotations

This app uses JSDoc type annotations to provide type safety in plain JavaScript:

```javascript
/** @type {import("@firebolt-js/types").FireboltClient} */
const firebolt = await FireboltServiceManager.get();
```

This pattern:
- Imports types from the `@firebolt-js/types` package
- Provides IntelliSense and type checking in VS Code
- Works without TypeScript compilation
- Leverages the existing JSDoc comments in the generated `.d.ts` files

## Running

Open `index.html` in a web browser. No build step is required - the JavaScript file is loaded directly. The app will log messages to the browser console.

## Examples

The `src/main.js` file contains examples of:

1. **FireboltServiceManager access**: Accessing the global FireboltServiceManager
2. **Client initialization**: Using `FireboltServiceManager.get()` to get the Firebolt client
3. **Module access**: Accessing modules like Device and Localization with JSDoc types
4. **Event subscriptions**: Subscribing to events like `onCountryChanged`
5. **Error handling**: Proper error handling for initialization failures
6. **Cleanup**: Properly cleaning up the Firebolt client

## TypeScript vs JavaScript

This JavaScript reference app demonstrates the same functionality as the TypeScript reference app (`../firebolt-type-reference-app/`), but with these differences:

| Aspect | TypeScript App | JavaScript App |
|--------|---------------|----------------|
| Source files | `.ts` | `.js` |
| Type annotations | Native TypeScript syntax | JSDoc comments |
| Build step | Required (`tsc`) | Not required |
| Runtime type safety | Yes | No (IDE-time only) |
| Configuration | `tsconfig.json` | `jsconfig.json` |
| Verbosity | Less verbose | More verbose (JSDoc) |

The JavaScript approach is ideal for developers who:
- Prefer plain JavaScript over TypeScript
- Want to avoid build steps
- Need type safety but don't require runtime type enforcement
- Want a simpler development workflow

## Notes

- This is a development/testing tool, not a production application
- The app relies on the FireboltServiceManager global injected by the WPE Firebolt web extension
- For production use, you would use the actual FireboltServiceManager provided by the WPE Firebolt web extension
- The app demonstrates type safety and IDE features through JSDoc, not runtime functionality
- Type checking happens in the IDE (VS Code), not at runtime
