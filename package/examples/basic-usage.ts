/**
 * Basic usage example for @firebolt-js/types
 * 
 * This example demonstrates how to use the Firebolt TypeScript definitions
 * with the FireboltServiceManager global pattern in WPE WebKit extensions.
 */

// Example 1: Access FireboltServiceManager version
console.log("Firebolt version:", FireboltServiceManager.version);

// Example 2: Get the Firebolt client
async function initializeFirebolt() {
  const firebolt = await FireboltServiceManager.get();
  
  // Access modules with full type safety
  // const deviceInfo = await firebolt.Device.deviceClass();
  // const country = await firebolt.Localization.country();
  
  // Subscribe to events with cancellation handling
  // const unsubscribe = firebolt.Localization.onCountryChanged((event, cancelled) => {
  //   if (cancelled) {
  //     console.log("Event was cancelled due to connection failure");
  //     return;
  //   }
  //   console.log("Country changed:", event);
  // });
  
  // Cleanup when done
  // firebolt.cleanup();
}

// Example 3: Error handling
async function initializeWithErrorHandling() {
  try {
    const firebolt = await FireboltServiceManager.get();
    console.log("Firebolt client initialized successfully");
    
    // Use the client...
  } catch (error) {
    console.error("Failed to initialize Firebolt:", error);
  }
}