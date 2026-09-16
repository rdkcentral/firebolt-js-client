# Firebolt Type Reference App

This is a reference application for testing the Firebolt TypeScript definitions package (`@firebolt-js/types`). It demonstrates how to use the inject-js factory/builder pattern and provides a realistic environment for manual IDE testing.

## Purpose

The reference app serves two purposes:

1. **Validation**: Test that the TypeScript definitions work correctly in a real project
2. **Examples**: Show developers how to use the Firebolt SDK with proper type safety

## Installation

The app uses `@firebolt-js/types` as a dev dependency (as types are only needed during development):

```bash
cd references/firebolt-type-reference-app
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
- Verify that TypeScript shows type errors
- Try accessing a non-existent module or method
- Verify that TypeScript shows appropriate errors

### 5. "Go to Definition" Navigation
- Right-click on a module name and select "Go to Definition"
- Verify that it navigates to the type definition in the `.d.ts` file
- Right-click on a method name and select "Go to Definition"
- Verify that it navigates to the method signature

## Building

```bash
npm run build
```

This compiles the TypeScript code to the `dist/` directory.

## Running

Open `index.html` in a web browser after building. The app will log messages to the browser console showing the mock transport behavior.

## Examples

The `src/main.ts` file contains examples of:

1. **Basic factory initialization**: Creating a builder with transport configuration
2. **Builder usage**: Using the `build()` method to get the Firebolt client
3. **Module access**: Accessing modules like Device and Localization
4. **Event subscriptions**: Subscribing to events like `onCountryChanged`
5. **Extension schema**: Using custom extension schemas for API extension
6. **Cleanup**: Properly cleaning up the Firebolt client

## Mock Transport

The `src/mock-transport.ts` file provides a mock implementation of the `FireboltTransport` interface for testing without a real Firebolt backend. It simulates:

- Connection opening/closing
- Message sending/receiving
- Error handling
- Callback invocation

## Notes

- This is a development/testing tool, not a production application
- The mock transport does not connect to a real Firebolt backend
- For production use, you would use the actual transport provided by the WPE Firebolt web extension
- The app demonstrates type safety and IDE features, not runtime functionality