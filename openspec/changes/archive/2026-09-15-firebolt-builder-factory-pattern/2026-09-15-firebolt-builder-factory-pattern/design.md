## Design Overview

The inject-js generator will be completely rewritten to match the firebolt-builder.js implementation from the feat/fireboltweb branch. The new design uses a factory pattern, static module generation, enhanced event listeners, extension schema support, and a revised transport interface.

## Architecture

### Current Architecture

```
┌─────────────────────────────────────────────────────────┐
│              Current inject-js Generator                │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  CanonicalAST → Generator → IIFE with global FSM       │
│                         │                               │
│                         ▼                               │
│  FireboltServiceManager.transport(t)                   │
│  FireboltServiceManager.get() → Promise<FireboltClient>│
│                                                         │
│  Dynamic module building from _methodRegistry          │
│  at runtime via _buildFireboltInstance()                │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### New Architecture

```
┌─────────────────────────────────────────────────────────┐
│              New inject-js Generator                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  CanonicalAST → Generator → Factory Function             │
│                         │                               │
│                         ▼                               │
│  factory({ transport, extensionSchema, enableDebug })   │
│    .build() → Promise<FireboltClient>                   │
│                                                         │
│  Static module generation via Object.defineProperty     │
│  at generation time for each method/event               │
│                                                         │
│  Extension schema loading at runtime                    │
│  Event listener cancellation support                   │
│  Debug mode with logging                                │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## AST to Emitted Code Chain

### Example: No-Param Method

**AST:**
```typescript
{
  name: "audioDescription",
  kind: "call",
  params: [],
  result: { kind: "primitive", primitive: "boolean" }
}
```

**Emitted Code (Static Generation):**
```javascript
var _accessibilityModule = Object.create(null);
_addMethodNoParams(_accessibilityModule, "audioDescription", "Accessibility");
```

**Helper Function:**
```javascript
function _addMethodNoParams(module, methodName, moduleName) {
  Object.defineProperty(module, methodName, {
    value: function() {
      return _rpcCall(moduleName + "." + methodName, {})
    },
    writable: false,
    enumerable: true,
    configurable: false
  })
}
```

### Example: Method with Object Parameter

**AST:**
```typescript
{
  name: "start",
  kind: "call",
  params: [
    { name: "intent", type: { kind: "primitive", primitive: "string" }, required: true },
    { name: "handleAppId", type: { kind: "primitive", primitive: "string" }, required: false }
  ],
  result: { kind: "null" }
}
```

**Emitted Code (Static Generation):**
```javascript
var _actionsModule = Object.create(null);
_addMethodWithObjectParam(_actionsModule, "start", "Actions");
```

**Helper Function:**
```javascript
function _addMethodWithObjectParam(module, methodName, moduleName) {
  Object.defineProperty(module, methodName, {
    value: function(params) {
      return _rpcCall(moduleName + "." + methodName, params || {})
    },
    writable: false,
    enumerable: true,
    configurable: false
  })
}
```

### Example: Event Listener

**AST:**
```typescript
{
  name: "onLanguageChanged",
  kind: "subscribe",
  params: [],
  result: { kind: "primitive", primitive: "string" }
}
```

**Emitted Code (Static Generation):**
```javascript
_addEvent(_accessibilityModule, "onAudioDescriptionChanged", "Accessibility");
```

**Helper Function:**
```javascript
function _addEvent(module, eventName, moduleName) {
  Object.defineProperty(module, eventName, {
    value: function(callback) {
      return _subscribe(moduleName + "." + eventName, callback)
    },
    writable: false,
    enumerable: true,
    configurable: false
  })
}
```

## Key Implementation Details

### 1. Factory Pattern

The generator emits a factory function instead of a global IIFE:

```javascript
return function({
  transport,
  extensionSchema,
  enableDebug
}) {
  // Validation and setup
  if (!transport) {
    throw new Error("Transport is required")
  }
  
  // Extension schema parsing
  if (typeof extensionSchema === "string" && extensionSchema.length > 0) {
    let parsedExtensionSchema = _commonParse(extensionSchema);
    if (_commonArrayCheck(parsedExtensionSchema)) {
      _extensionSchema = parsedExtensionSchema
    } else {
      console.warn("invalid extension after parsing")
    }
  }
  
  // Transport validation
  var requiredMethods = ["send", "open", "close"];
  for (var i = 0; i < requiredMethods.length; i++) {
    var method = requiredMethods[i];
    if (!transport[method]) {
      throw new Error("Transport object must have a '" + method + "' method. " +
                      "Missing method: " + method);
    }
  }
  
  _transport = transport;
  
  // Debug mode setup
  if (enableDebug && enableDebug === true) {
    _debug = true;
    window.___fireboltTransport___ = _transport;
  }
  
  // Return builder object
  return {
    build: function() {
      if (_connected && _fireboltInstance) {
        return Promise.resolve(_fireboltInstance)
      }
      var p = new Promise(function(resolve) {
        _connectionResolvers.push(resolve)
      });
      if (!_connecting) {
        if (!_transportSet) {
          _transport.onMessage = _onMessage;
          _transport.onOpen = _onOpen;
          _transport.onClose = _onClose;
          _transport.onError = _onError;
          _transportSet = true;
        }
        _connect();
      }
      return p
    }
  }
}
```

### 2. Transport Interface

**New Transport Interface:**
- `send(msg)` - Send message to transport
- `open()` - Open connection
- `close()` - Close connection
- `onMessage` - Callback property for message handling
- `onOpen` - Callback property for connection opened
- `onClose` - Callback property for connection closed
- `onError` - Callback property for connection errors

**Connection Management:**
```javascript
function _onOpen() {
  console.log("Firebolt transport opened");
  _connected = true;
  if (!_fireboltInstance) {
    _fireboltInstance = _buildFireboltInstance()
  }
  var resolvers = _connectionResolvers.splice(0);
  for (var i = 0; i < resolvers.length; i++) {
    resolvers[i](_fireboltInstance)
  }
}

function _onClose() {
  console.log("Firebolt transport closed");
  _connected = false;
}

function _onError(error) {
  console.error("Firebolt transport error:", error);
  clearPendingCalls();
  clearEventListeners();
  _connected = false;
  _connect()
}

function _connect() {
  if (_connected){
    return false;
  }
  _transport.open();
  _connecting = true;
}
```

### 3. Event Listener Cancellation

**Enhanced Event Callback Signature:**
```javascript
// Old signature
callback(payload)

// New signature
callback(object, cancelled: bool)
```

**Cancellation Handling:**
```javascript
function clearEventListeners() {
  for (var eventName in _eventListeners) {
    for (var i = 0; i < _eventListeners[eventName].length; i++) {
      _eventListeners[eventName][i](null, false);
    }
  }
  _eventListeners = Object.create(null);
}
```

When connection fails or is cancelled, event listeners are called with `(null, true)` to allow developers to react appropriately.

### 4. Extension Schema Loading

**Extension Schema Format:**
```json
[
  {
    "name": "CustomModule",
    "methods": ["method1", "method2"],
    "events": ["onCustomEvent"],
    "methodsWithObject": ["complexMethod"]
  }
]
```

**Loading Logic:**
```javascript
function _addExtensions() {
  if (_extensionSchema) {
    var methodCheck = function(method) {
      return typeof method === "string" && method.length > 0
    };
    var fullcheck = function(module, method) {
      return methodCheck(method) && (!_fireboltRegistry[module] || !_fireboltRegistry[module][method])
    };
    var loadMethods = function(obj, mfn, ifn, moduleName) {
      if (_commonArrayCheck(obj)) {
        obj.forEach(o => {
          var c = mfn(o);
          if (fullcheck(moduleName, c)) {
            ifn(o, c);
            console.log("Extended Method " + c + " added to module " + moduleName)
          } else {
            console.warn("Method " + c + " already exists in module " + moduleName)
          }
        })
      }
    };
    _extensionSchema.forEach(schema => {
      if (schema) {
        if (typeof schema.name === "string" && schema.name.length > 0) {
          let moduleName = schema.name;
          var existingModule = false;
          if (_fireboltRegistry[moduleName]) {
            existingModule = true
          }
          let module = _fireboltRegistry[moduleName] || Object.create(null);
          loadMethods(schema.methods, method => method, (o, c) => _addMethodNoParams(module, c, moduleName), moduleName);
          loadMethods(schema.events, event => event, (o, c) => _addEvent(module, c, moduleName), moduleName);
          loadMethods(schema.methodsWithObject, method => method, (o, c) => _addMethodWithObjectParam(module, c, moduleName), moduleName);
          if (!existingModule) {
            _registerModule(moduleName, module)
          }
        }
      }
    })
  }
}
```

### 5. Debug Mode

**Debug Mode Implementation:**
```javascript
if (enableDebug && enableDebug === true) {
  _debug = true;
  window.___fireboltTransport___ = _transport;
}

function _onMessage(raw) {
  var message;
  try {
    message = _commonParse(raw)
    if(_debug) {
      console.log("-->" + raw);
    }
  } catch (e) {
    return
  }
  // ... rest of message handling
}

function _send(data, failureCallback) {
  try {
    _transport.send(data);
    if(_debug) {
      console.log("<--" + data);
    }
  } catch(e) {
    if (failureCallback) {
      failureCallback(e);
    }
  }
}
```

### 6. Static Module Generation

**Static Generation Approach:**
Instead of building modules dynamically from a registry at runtime, the generator emits static `Object.defineProperty` calls for each method and event:

```javascript
// For each module in AST
var _<module>Module = Object.create(null);

// For each no-param method
_addMethodNoParams(_<module>Module, "<method>", "<Module>");

// For each method with object params
_addMethodWithObjectParam(_<module>Module, "<method>", "<Module>");

// For each event
_addEvent(_<module>Module, "<event>", "<Module>");

// Register module
_registerModule("<Module>", _<module>Module);
```

**Benefits:**
- Better performance (no runtime registry lookup)
- Better security (static structure)
- Smaller runtime footprint
- Easier to debug and understand

### 7. Cleanup Method

**Cleanup Implementation:**
```javascript
Object.defineProperty(_fireboltRegistry, "cleanup", {
  value: function() {
    reset();
    if (_transport && _transport.close) {
      _transport.close()
    }
    _fireboltInstance = null;
  },
  writable: false,
  enumerable: true,
  configurable: false
})

function reset() {
  clearEventListeners();
  clearPendingCalls();
  _connectionResolvers = [];
  _connected = false;
  _connecting = false;
}
```

## Generator Implementation Structure

The generator will be restructured as follows:

```typescript
function generate(ast: CanonicalAST, _config: GenConfig): GeneratorOutput[] {
  // Filter to web + both platform modules only
  const webModules = ast.modules.filter(
    (m) => m.platform === "web" || m.platform === "both"
  );

  // Generate static module definitions
  const staticModules = emitStaticModules(webModules);
  
  // Generate version constant
  const versionVar = emitVersionVar(ast.version);

  // Assemble the factory function
  const content = [
    `(function() {`,
    STATIC_PREAMBLE,          // Private state, helper functions
    STATIC_RUNTIME,           // Transport layer, RPC, subscribe
    staticModules,             // Static module definitions
    STATIC_POSTAMBLE,         // Factory function return
    `})();`,
  ].join("\n");

  return [
    {
      filePath: "inject-js/firebolt-inject.js",
      content,
    },
  ];
}
```

## Migration Path

Since there are no existing consumers for firebolt web, there is no migration path needed. This is a complete replacement of the inject-js generator output.

## Testing Strategy

The test suite will be updated to cover:

1. **Factory Pattern**: Test factory function creation and builder pattern
2. **Transport Interface**: Test new transport interface with send, open, close
3. **Event Cancellation**: Test event listener cancellation with (null, true)
4. **Extension Schema**: Test extension schema loading and validation
5. **Debug Mode**: Test debug logging and transport exposure
6. **Connection Management**: Test onOpen, onClose, onError callbacks
7. **Cleanup Method**: Test cleanup functionality
8. **Static Generation**: Verify static Object.defineProperty calls
9. **Auto-Reconnect**: Test reconnection logic on errors

## Performance Considerations

- **Static Generation**: Eliminates runtime registry lookup overhead
- **Connection Pooling**: Reuses existing connections when possible
- **Event Listener Optimization**: Eager registration with proper cleanup
- **Extension Schema**: Lazy loading only when schema is provided

## Security Considerations

- **Transport Validation**: Strict validation of required transport methods
- **Extension Schema**: Validation of JSON format before parsing
- **Debug Mode**: Disabled by default, only enabled explicitly
- **Static Structure**: Immutable module definitions via Object.defineProperty
- **Error Handling**: Proper cleanup on connection failures to prevent state leaks
