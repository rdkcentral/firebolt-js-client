/**
 * Basic usage example for @firebolt-js/types
 * 
 * This example demonstrates how to use the Firebolt TypeScript definitions
 * with the inject-js factory/builder pattern.
 */

import { factory, FireboltTransport, FactoryConfig } from "@firebolt-js/types";

// Example 1: Basic factory initialization
const basicConfig: FactoryConfig = {
  transport: {
    send: (data: string) => {
      console.log("Sending:", data);
    },
    open: () => {
      console.log("Opening connection");
    },
    close: () => {
      console.log("Closing connection");
    },
  },
};

const builder = factory(basicConfig);

// Example 2: Using the builder
async function initializeFirebolt() {
  const firebolt = await builder.build();
  
  // Access modules with full type safety
  // const deviceInfo = await firebolt.Device.deviceClass();
  // const country = await firebolt.Localization.country();
  
  // Subscribe to events
  // const unsubscribe = firebolt.Localization.onCountryChanged((event) => {
  //   console.log("Country changed:", event);
  // });
  
  // Cleanup
  // firebolt.cleanup();
}

// Example 3: Using extension schema
const extendedConfig: FactoryConfig = {
  transport: basicConfig.transport,
  extensionSchema: [
    {
      name: "CustomModule",
      methods: ["customMethod"],
      events: [],
      methodsWithObject: [],
    },
  ],
};

const extendedBuilder = factory(extendedConfig);

// Example 4: Debug mode
const debugConfig: FactoryConfig = {
  transport: basicConfig.transport,
  enableDebug: true,
};

const debugBuilder = factory(debugConfig);