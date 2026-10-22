---
title: Firebolt Web Developer Resources
description: Firebolt 9 Web API documentation and certification tools
---

<div style="display: flex; align-items: center; margin-bottom: 16px;"><img src="/firebolt-logo-small.png" alt="Firebolt" style="height: 24px; margin-right: 8px;" /> Firebolt Web</div>

# Developer Resources

Welcome to the Firebolt Web JavaScript client documentation. This site provides API references and tools for developing Firebolt 9 Web applications.

## Quick Links

- [API Documentation](/api/accessibility) - Complete API reference for all Firebolt 9 Web modules
- [References](/references) - External specifications and resources

## About Firebolt

Firebolt is a platform-agnostic API specification for connected TV applications. The Firebolt JavaScript client provides type-safe access to Firebolt APIs for web-based runtimes.

## Getting Started

### Prerequisite

Before using any Firebolt API, you must initialize the Firebolt service:

```javascript
// FireboltServiceManager is injected globally by the WPE WebKit extension.

const firebolt = await FireboltServiceManager.get()
```

The `firebolt` object is your entry point to all Firebolt modules and methods. The examples in the API documentation assume you have already initialized this object.

### Usage

Once initialized, you can access modules and their methods:

```javascript
// Get device information
const deviceName = await firebolt.Device.name

// Subscribe to events
firebolt.Device.onNameChanged((data, cancelled) => {
  if (cancelled) {
    console.log('Event listener was cancelled')
    return
  }
  console.log('Device name changed:', data)
})

// Call actions
const result = await firebolt.Actions.start({ intent: { action: 'play', entityId: 'entity-123' } })
```

### Event Listeners

All event listeners receive two parameters:

1. **`data`** - The event payload with the type-specific data
2. **`cancelled`** - A boolean indicating if the listener was cancelled by the platform

The `cancelled` parameter is `true` when the platform cancels the event subscription (e.g., when the app is suspended or terminated). Always check this parameter before processing event data:

```javascript
firebolt.Device.onNameChanged((data, cancelled) => {
  if (cancelled) {
    // Listener was cancelled - clean up resources
    return
  }
  // Process the event data
  console.log('New device name:', data)
})
```

### Explore the API

Browse the [API Documentation](/api/accessibility) to see all available modules and methods.

## API Modules

The Firebolt 9 API includes the following modules:

- **Accessibility** - Platform accessibility settings
- **Actions** - Intent handling and actions
- **Advertising** - Advertising identifiers
- **Device** - Device information and capabilities
- **Discovery** - Content discovery and reporting
- **Display** - Display settings and video resolutions
- **Localization** - Locale and language settings
- **Metrics** - Analytics and metrics reporting
- **Network** - Network status and information
- **VideoOutput** - Video output configuration

## Support

For more information, visit the [References](/references) page for external specifications and resources.
