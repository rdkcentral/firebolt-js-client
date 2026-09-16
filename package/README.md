# @firebolt-js/types

TypeScript definitions for the Firebolt 9 inject-js factory/builder pattern, enabling VS Code intellisense, hover documentation, and type safety for app developers.

## Installation

Install as a dev dependency (types are only needed during development):

```bash
npm install --save-dev @firebolt-js/types
```

## Usage

The package provides TypeScript definitions for the Firebolt inject-js factory pattern:

```typescript
import { factory, FireboltTransport, FactoryConfig } from "@firebolt-js/types";

// Configure the factory
const config: FactoryConfig = {
  transport: yourTransportImplementation,
  enableDebug: true,
};

// Create the builder
const builder = factory(config);

// Build the Firebolt client
const firebolt = await builder.build();

// Use the Firebolt client with full type safety
const deviceClass = await firebolt.Device.deviceClass();
const country = await firebolt.Localization.country();

// Subscribe to events
const unsubscribe = firebolt.Localization.onCountryChanged((event) => {
  console.log("Country changed:", event);
});

// Cleanup when done
firebolt.cleanup();
```

## Type Definitions

The package includes the following TypeScript definitions:

- **FireboltTransport**: Interface for the transport layer
- **ExtensionSchema**: Interface for dynamic API extension
- **FactoryConfig**: Configuration interface for the factory function
- **FireboltBuilder**: Interface for the builder object
- **FireboltClient**: Interface for the Firebolt client with all module namespaces
- **factory**: Factory function to create the builder

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

## Extension Schema

You can extend the Firebolt API dynamically using the extension schema:

```typescript
const configWithExtension: FactoryConfig = {
  transport: yourTransportImplementation,
  extensionSchema: [
    {
      name: "CustomModule",
      methods: ["customMethod"],
      events: [],
      methodsWithObject: [],
    },
  ],
};
```

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