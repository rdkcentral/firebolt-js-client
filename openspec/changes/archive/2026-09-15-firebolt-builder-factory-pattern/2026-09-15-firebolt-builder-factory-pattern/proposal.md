## Why

The inject-js generator currently produces a global `FireboltServiceManager` with a `transport()` setter and `get()` method pattern. The new firebolt-builder.js implementation from the feat/fireboltweb branch introduces a factory pattern that provides better security, scalability, and developer experience for WPE WebKit extensions. Key improvements include:

1. **Factory Pattern**: Instead of a global singleton, the generator produces a factory function that accepts configuration (transport, extensionSchema, enableDebug) and returns a builder with a `build()` method
2. **Enhanced Event Listeners**: Event callbacks now receive two parameters `(object, cancelled: bool)` allowing developers to react to connection failures and cancellations
3. **Extension Schema Support**: Dynamic extension loading allows app developers to extend the Firebolt API with custom modules and methods at runtime
4. **Improved Transport Interface**: New transport interface with `send()`, `open()`, `close()` and callback properties for better connection management
5. **Debug Mode**: Optional debug logging for development and troubleshooting
6. **Static Module Generation**: Methods and events are defined statically at generation time using `Object.defineProperty` for better performance and security

Since there are no existing consumers for the firebolt web implementation, this is a complete replacement without backward compatibility concerns.

## What Changes

- **Factory Pattern**: Replace global `FireboltServiceManager` with factory function that accepts `{ transport, extensionSchema, enableDebug }` and returns object with `build()` method
- **Transport Interface**: Change from `send(msg)`, `onMessage(callback)`, `onConnectionStatus(callback)`, `connect()`, `disconnect()` to `send(msg)`, `open()`, `close()` with callback properties `onMessage`, `onOpen`, `onClose`, `onError`
- **Event Listener Signature**: Change from single parameter `callback(payload)` to two parameters `callback(object, cancelled: bool)` where cancelled is true on connection failures
- **Extension Schema Support**: Add dynamic extension schema loading via JSON string parameter with format: `[{"name": "Module", "methods": [], "events": [], "methodsWithObject": []}]`
- **Debug Mode**: Add optional `enableDebug` flag for console logging and exposing transport globally as `window.___fireboltTransport___`
- **Connection Management**: Replace `onConnectionStatus("connected")` callback with `onOpen()` and `onClose()` callbacks with auto-reconnect on error
- **Cleanup Method**: Replace `disconnect()` method on FireboltClient with `cleanup()` method on registry object
- **Static Generation**: Change from dynamic module building at runtime to static `Object.defineProperty` calls for each method/event at generation time
- **Helper Functions**: Add common function references (`_commonStringify`, `_commonParse`, `_commonArrayCheck`) for consistency
- **Error Handling**: Improve error handling with auto-reconnect logic and proper cleanup on connection failures

**Breaking Changes**: This is a complete replacement of the inject-js generator output. Since there are no existing consumers for firebolt web, there are no backward compatibility concerns.

## Capabilities

### New Capabilities
- **Extension Schema Loading**: App developers can dynamically extend the Firebolt API with custom modules and methods at runtime
- **Event Cancellation Handling**: Event listeners can detect and react to connection failures via the cancelled parameter
- **Debug Mode**: Optional debug logging for development and troubleshooting
- **Auto-Reconnect**: Automatic reconnection on transport errors with proper state cleanup

### Modified Capabilities
- `wpe-inject-js-generator`: Complete rewrite of the inject-js generator specification to support factory pattern, new transport interface, enhanced event listeners, extension schema support, debug mode, and static module generation

## Impact

- **Generator code**: `src/generators/inject-js.ts` - complete rewrite to match firebolt-builder.js implementation
- **Test code**: `src/generators/inject-js.test.ts` - comprehensive update to test new patterns
- **Generated output**: `generated/inject-js/firebolt-inject.js` - will be completely regenerated with new structure
- **Documentation**: 
  - `openspec/specs/api/wpe-inject-js-generator/spec.md` - major update with new requirements
  - `openspec/specs/_meta/inject-js-parameter-patterns.md` - update to reflect static generation approach
  - New extension schema documentation for app developers
- **User code**: Complete replacement - consumers will need to update to use factory pattern and new transport interface
- **Dependencies**: No new dependencies required

## Pipeline Impact

- **Spec Layer**: Update `wpe-inject-js-generator` spec with new requirements for factory pattern, transport interface, event listeners, extension schema, debug mode, and static generation
- **OpenRPC Layer**: No changes - OpenRPC contracts remain unchanged
- **AST Layer**: No changes - Canonical AST structure remains unchanged
- **Generator Layer**: Complete rewrite of inject-js generator to match firebolt-builder.js implementation
- **Test Layer**: Comprehensive test updates for new patterns

## Target Languages

- **inject-js**: Complete rewrite of the JavaScript injection bundle for WPE WebKit extensions

## Firebolt 9 Modules in Scope

All Firebolt 9 web and both platform modules are affected by this change as the generator output structure is completely replaced. The module specifications themselves do not change, only how they are generated and exposed to consumers.

## References

- Reference implementation: `webkitExtension/resources/firebolt-builder.js` (feat/fireboltweb branch)
- Compatibility layer: `webkitExtension/resources/firebolt-bridge.js` (feat/fireboltweb branch) - excluded from this scope
- Current generator: `src/generators/inject-js.ts`
- Current spec: `openspec/specs/api/wpe-inject-js-generator/spec.md`
- Parameter patterns: `openspec/specs/_meta/inject-js-parameter-patterns.md`
