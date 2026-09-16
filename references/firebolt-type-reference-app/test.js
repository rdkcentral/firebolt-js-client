/**
 * JavaScript test file to demonstrate that TypeScript definitions work for JS apps.
 * 
 * Even though this is a .js file, VS Code will provide intellisense, hover docs,
 * and autocomplete using the .d.ts definitions from @firebolt-js/types.
 */

// Import the factory function (works in JavaScript too)
const { factory } = require("@firebolt-js/types");

// Mock transport implementation
const mockTransport = {
  send: (data) => {
    console.log("Sending:", data);
  },
  open: () => {
    console.log("Opening connection");
  },
  close: () => {
    console.log("Closing connection");
  },
  onMessage: (raw) => {
    console.log("Received:", raw);
  },
  onOpen: () => {
    console.log("Connection opened");
  },
  onClose: () => {
    console.log("Connection closed");
  },
  onError: (error) => {
    console.error("Error:", error);
  },
};

// Example 1: Basic factory usage
const config = {
  transport: mockTransport,
  enableDebug: true,
};

const builder = factory(config);

// Example 2: Using the builder
async function testFirebolt() {
  try {
    const firebolt = await builder.build();
    let params = {
      intent: "some_intent",
      handlerAppId: "some_value", // Replace with actual fields as needed
    };
    await firebolt.Actions.start(params);

    // Example 3: Accessing modules (VS Code will show intellisense)
    // const deviceClass = await firebolt.Device.deviceClass();
    // const country = await firebolt.Localization.country();

    // Example 4: Subscribing to events
    // const unsubscribe = firebolt.Localization.onCountryChanged((event) => {
    //   console.log("Country changed:", event);
    // });

    // Example 5: Cleanup
    // firebolt.cleanup();
  } catch (error) {
    console.error("Failed to initialize:", error);
  }
}

// Example 6: Using extension schema
const configWithExtension = {
  transport: mockTransport,
  extensionSchema: JSON.stringify([
    {
      name: "CustomModule",
      methods: ["customMethod"],
      events: [],
      methodsWithObject: [],
    },
  ]),
};

const builderWithExtension = factory(configWithExtension);

// Run the test
console.log("JavaScript test file - TypeScript definitions provide IDE support");
console.log("Open this file in VS Code to see intellisense and hover documentation");
testFirebolt().catch(console.error);