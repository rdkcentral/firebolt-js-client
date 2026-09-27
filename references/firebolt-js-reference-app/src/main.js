// Example 1: Access FireboltServiceManager version
console.log("FireboltServiceManager version:", FireboltServiceManager.version);

// Example 2: Using FireboltServiceManager.get() to get the Firebolt client
async function initializeFirebolt() {
  try {
    /** @type {import("@firebolt-js/types").FireboltClient} */
    const firebolt = await FireboltServiceManager.get();
    
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
