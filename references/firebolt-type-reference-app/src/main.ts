import { FireboltClient } from "@firebolt-js/types";


// Example 1: Access FireboltServiceManager version
// @ts-ignore - accessing global for testing
console.log("FireboltServiceManager version:", globalThis.FireboltServiceManager.version);

// Example 2: Using FireboltServiceManager.get() to get the Firebolt client
async function initializeFirebolt() {
  try {
    // @ts-ignore - accessing global for testing
    const firebolt: FireboltClient = await globalThis.FireboltServiceManager.get();
    
    console.log("Firebolt client initialized:", firebolt);

    // Example: Metrics.appInfo with primitive-wrap pattern
    // This should accept a string and wrap it into { build: "value" }
    // await firebolt.Metrics.appInfo("1.2.3");

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

// Initialize on load
initializeFirebolt().catch(console.error);