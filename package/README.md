# @firebolt-js/types

TypeScript definitions for the Firebolt 9 FireboltServiceManager global pattern, enabling VS Code intellisense, hover documentation, and type safety for app developers using WPE WebKit extensions.

## Installation

Install as a dev dependency (types are only needed during development):

```bash
npm install --save-dev @firebolt-js/types
```

## Usage

The package provides TypeScript definitions for the FireboltServiceManager global object that is injected by the WPE WebKit extension:

```typescript
// Access the FireboltServiceManager version
console.log("Firebolt version:", FireboltServiceManager.version);

// Get the Firebolt client
const firebolt = await FireboltServiceManager.get();

// Use the Firebolt client with full type safety
const deviceClass = await firebolt.Device.deviceClass();
const country = await firebolt.Localization.country();

// Subscribe to events
const unsubscribe = firebolt.Localization.onCountryChanged((event, cancelled) => {
  console.log("Country changed:", event);
});

// Cleanup when done
firebolt.cleanup();
```

## Type Definitions

The package includes the following TypeScript definitions:

- **FireboltServiceManager**: Global interface injected by WPE WebKit extension
  - `version`: Readonly string containing the Firebolt SDK version
  - `get()`: Method that returns a Promise resolving to the FireboltClient
- **FireboltClient**: Interface for the Firebolt client with all module namespaces

## Module Namespaces

The FireboltClient interface includes all web/both platform modules:

- Accessibility
- Actions
- Advertising
- Device
- Discovery
- Display
- Localization
- Metrics
- Network
- VideoOutput

Each module namespace contains its methods and events with full type definitions.

## Event Callbacks

Event callbacks in Firebolt 9 use a two-parameter signature:

```typescript
firebolt.Localization.onCountryChanged((event, cancelled) => {
  if (cancelled) {
    console.log("Event was cancelled due to connection failure");
    return;
  }
  console.log("Country changed:", event);
});
```

The second parameter `cancelled` is `true` when the event is cancelled due to connection failures, allowing you to handle disconnection scenarios gracefully.

## IDE Features

When installed, this package provides:

- **Intellisense**: Auto-complete for module names, methods, and parameters
- **Hover Documentation**: JSDoc comments appear when hovering over methods and parameters
- **Type Checking**: TypeScript validates correct usage and catches errors
- **Navigation**: "Go to Definition" works for all types and methods

## Versioning

The package version follows the Firebolt API version (e.g., 9.0.0 for Firebolt 9).

## License

See the main project LICENSE file for details.