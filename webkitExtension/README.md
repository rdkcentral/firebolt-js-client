# Firebolt WebKit Extension

A WPEWebKit extension that provides Firebolt API support for web applications running on RDK platforms. This extension injects the Firebolt JavaScript runtime into web pages and provides WebSocket-based transport for communicating with Firebolt services.

## Overview

The extension integrates with WPEWebKit to:
- Inject the Firebolt JavaScript runtime into web pages
- Provide a WebSocket transport layer for Firebolt API calls
- Bridge between native C++ code and JavaScript
- Support Firebolt Service Manager builder pattern

## Building

### Prerequisites

- **CMake** 3.10+
- **WPEWebKit** development libraries
- **C++17** compatible compiler
- **GLib** and related dependencies
- **Node.js** and **npm** (required to regenerate the embedded Firebolt builder)

### Build Instructions

From the repository root, install the JavaScript dependencies and generate the API bundles before configuring the native build:

```bash
npm ci
npm run generate
```

The generation step refreshes `webkitExtension/resources/firebolt-builder.js` from the OpenRPC-derived API definitions. Run it after API changes and include the updated generated resource in the same change. CMake embeds this file but does not run npm or regenerate it.

```bash
# Create build directory
mkdir build
cd build

# Configure with CMake
cmake ..

# Build
make

# Install (optional)
make install
```

The extension will be built as a shared library and installed to the WPEWebKit extensions directory.

## Configuration

The extension can be configured through:

### 1. Environment Variables

Set the `FIREBOLT_ENDPOINT` environment variable to specify the Firebolt service endpoint:

```bash
export FIREBOLT_ENDPOINT=ws://localhost:9999
```

### 2. WPEWebKit Settings

Pass configuration through WPEWebKit's user data:

```cpp
GVariantDict firebolt_settings;
g_variant_dict_init(&firebolt_settings, NULL);
g_variant_dict_insert(&firebolt_settings, "fireboltEndpoint", "s",
                      "ws://localhost:9999");
g_variant_dict_insert(&firebolt_settings, "enableDebug", "b", TRUE);

GVariantDict settings;
g_variant_dict_init(&settings, NULL);
g_variant_dict_insert_value(&settings, "firebolt",
                            g_variant_dict_end(&firebolt_settings));
GVariant *settings_variant = g_variant_dict_end(&settings);
```

### 3. Configuration Priority

1. WPEWebKit settings (highest priority)
2. Environment variable `FIREBOLT_ENDPOINT`
3. Default (will fail if not set)

## Architecture

### Components

- **fireboltextension.cpp**: Main extension entry point and initialization
- **helper.cpp/h**: Helper functions for JavaScript evaluation and transport creation
- **wstransport.cpp/h**: WebSocket transport implementation
- **websocketclient.cpp/h**: WebSocket client for Firebolt communication
- **soupfunctions.cpp/h**: Soup-based HTTP/WebSocket utilities
- **resources/firebolt-bridge.js**: JavaScript bridge for FireboltServiceManager
- **resources/firebolt-builder.js**: JavaScript builder implementation

### Flow

```
WebKit Page Load
    ↓
Extension Initialization
    ↓
Inject Bridge Script (firebolt-bridge.js)
    ↓
Create Builder Factory
    ↓
Inject Builder Script (firebolt-builder.js)
    ↓
Create WebSocket Transport
    ↓
FireboltServiceManager Available to Web App
```

## JavaScript API

The extension exposes the `FireboltServiceManager` global to web pages:

```javascript
// Get the Firebolt instance
const firebolt = await FireboltServiceManager.get();

// Use Firebolt APIs
const deviceInfo = await firebolt.device.info();
```

### Builder Pattern

The extension uses a builder pattern for initialization:

// The extension invokes the builder callback internally.
// Web applications initialize the client with:
const firebolt = await FireboltServiceManager.get();

## Integration with Firebolt JS Client

This extension works with the Firebolt JavaScript client generated from the OpenSpec specifications in the parent directory:

1. **Type Definitions**: Use `@rdkcentral/firebolt-js-types` for TypeScript support
2. **Runtime**: The extension provides the runtime implementation
3. **Transport**: WebSocket-based communication with Firebolt services

## Debugging

Enable debug mode to see detailed logging:

```bash
# Via environment variable (not currently supported, use WPEWebKit settings)
# Via WPEWebKit settings
g_variant_dict_insert(&settings, "enableDebug", "b", TRUE);
```

Debug logs will be output through the GLib logging system with the domain `FireboltExtension`.

## File Structure

```
webkitExtension/
├── CMakeLists.txt              # Main build configuration
├── fireboltextension.cpp       # Extension entry point
├── helper.cpp/h                # JavaScript evaluation helpers
├── wstransport.cpp/h           # WebSocket transport
├── websocketclient.cpp/h       # WebSocket client
├── soupfunctions.cpp/h         # Soup utilities
├── resources/
│   ├── CMakeLists.txt          # Resource build configuration
│   ├── firebolt-bridge.js      # Service manager bridge
│   ├── firebolt-builder.js     # Builder implementation
│   └── fireboltresourcebundle.xml  # Resource bundle
└── cmake/                      # CMake modules
```

## Updating JavaScript Resources

The JavaScript resources in the `resources/` directory are embedded into the extension during build. To update them:

1. Modify the JavaScript files in `resources/`
2. Rebuild the extension
3. Reinstall/reload the extension in WPEWebKit

## Troubleshooting

### Extension Not Loading

- Verify WPEWebKit can find the extension in the extensions directory
- Check that all dependencies are installed
- Review GLib logs for initialization errors

### FIREBOLT_ENDPOINT Not Set

- Ensure `FIREBOLT_ENDPOINT` environment variable is set
- Or provide endpoint via WPEWebKit settings
- Check that the endpoint URL is valid and accessible

### WebSocket Connection Failures

- Verify the Firebolt service is running at the specified endpoint
- Check network connectivity
- Enable debug mode to see connection attempts

### JavaScript Errors

- Enable debug mode to see JavaScript evaluation errors
- Check that the bridge and builder scripts are properly embedded
- Verify the FireboltServiceManager is being initialized correctly

## Version Compatibility

- **Firebolt API Version**: 9.0
- **WPEWebKit**: Compatible with recent WPEWebKit releases
- **C++ Standard**: C++17

## License

Apache License Version 2.0

Copyright 2026 RDK Management
