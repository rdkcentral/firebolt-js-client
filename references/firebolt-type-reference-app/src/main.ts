import { factory, FireboltTransport, FactoryConfig } from "@firebolt-js/types";

// Mock transport implementation for testing
const mockTransport: FireboltTransport = {
  send: (data: string) => {
    console.log("Sending data:", data);
  },
  open: () => {
    console.log("Opening transport connection");
  },
  close: () => {
    console.log("Closing transport connection");
  },
  onMessage: (raw: string) => {
    console.log("Received message:", raw);
  },
  onOpen: () => {
    console.log("Transport opened");
  },
  onClose: () => {
    console.log("Transport closed");
  },
  onError: (error: unknown) => {
    console.error("Transport error:", error);
  },
};

// Example 1: Basic factory initialization
const config: FactoryConfig = {
  transport: mockTransport,
  enableDebug: true,
};

const builder = factory(config);

// Example 2: Using the builder to get the Firebolt client
async function initializeFirebolt() {
  try {
    const firebolt = await builder.build();
    console.log("Firebolt client initialized:", firebolt);

    // Example: Metrics.appInfo with primitive-wrap pattern
    // This should accept a string and wrap it into { build: "value" }
    await firebolt.Metrics.appInfo("1.2.3");

    // Example 3: Accessing modules (these should show intellisense)
    // const deviceInfo = await firebolt.Device.deviceClass();
    // const country = await firebolt.Localization.country();

    // Example 4: Subscribing to events
    // const unsubscribe = firebolt.Localization.onCountryChanged((event) => {
    //   console.log("Country changed:", event);
    // });

    // Example 5: Cleanup
    // firebolt.cleanup();
  } catch (error) {
    console.error("Failed to initialize Firebolt:", error);
  }
}

// Example 6: Using extension schema
const configWithExtension: FactoryConfig = {
  transport: mockTransport,
  extensionSchema: JSON.stringify([
    {
      name: "CustomModule",
      methods: ["customMethod"],
      events: [],
      methodsWithObject: [],
      methodsWithPrimitiveWrap: [
        { method: "customPrimitiveMethod", param: "value" }
      ],
    },
  ]),
};

const builderWithExtension = factory(configWithExtension);

// Initialize on load
initializeFirebolt().catch(console.error);