/**
 * inject-js FullASTGenerator.
 *
 * Emits a single self-contained ES5 IIFE bundle at generated/inject-js/firebolt-inject.js
 * that returns a factory function for use by the WPE Firebolt extension.
 *
 * Only web-platform modules (platform: "web" | "both") are included.
 *
 * The generated file has three sections:
 *   [STATIC PREAMBLE]   — private state, helper functions, transport layer
 *   [STATIC MODULES]    — static module definitions using Object.defineProperty
 *   [STATIC POSTAMBLE]  — factory function return
 */

import {
  CanonicalAST,
  Module,
} from "../ast/types";
import { GenConfig, GeneratorOutput, registerFullASTGenerator } from "./index";



// ---------------------------------------------------------------------------
// Helper functions for parameter pattern detection
// ---------------------------------------------------------------------------

function getParamPattern(method: any, module: Module): "no-params" | "single-param" | "primitive-wrap" {
  if (method.params.length === 0) {
    return "no-params";
  }
  if (method.params.length === 1) {
    const param = method.params[0];
    // Check for single-primitive-wrap pattern:
    // - param is a NamedRef to an object type
    // - object has exactly 1 property
    // - that property is required
    // - that property is a primitive type
    if (param.type && param.type.kind === "named") {
      const typeDecl = module.types.find(t => t.name === param.type.name);
      if (typeDecl && typeDecl.kind === "object" &&
          typeDecl.properties.length === 1 &&
          typeDecl.properties[0].required &&
          typeDecl.properties[0].type.kind === "primitive") {
        return "primitive-wrap";
      }
    }
  }
  return "single-param";
}

// ---------------------------------------------------------------------------
// Emit static module definitions
// ---------------------------------------------------------------------------

function emitStaticModules(modules: Module[]): string {
  const lines: string[] = [];

  for (const mod of modules) {
    lines.push(`  // Module: ${mod.name}`);
    lines.push(`  var _${mod.name} = Object.create(null);`);

    for (const method of mod.methods) {
      // Skip native-only methods when generating for web
      if (method.platform === "native") continue;

      const pattern = getParamPattern(method, mod);

      if (method.kind === "call") {
        if (pattern === "no-params") {
          lines.push(`  _addMethodNoParams(_${mod.name}, "${method.name}", "${mod.name}");`);
        } else if (pattern === "primitive-wrap") {
          const paramType = method.params[0].type;
          if (paramType.kind === "named") {
            const typeDecl = mod.types.find(t => t.name === paramType.name);
            if (typeDecl && typeDecl.kind === "object") {
              const paramName = typeDecl.properties[0].name;
              lines.push(`  _addMethodWithPrimitiveWrap(_${mod.name}, "${method.name}", "${mod.name}", "${paramName}");`);
            }
          }
        } else {
          lines.push(`  _addMethodWithObjectParam(_${mod.name}, "${method.name}", "${mod.name}");`);
        }
      } else {
        // subscribe
        lines.push(`  _addEvent(_${mod.name}, "${method.name}", "${mod.name}");`);
      }
    }

    lines.push(`  _registerModule("${mod.name}", _${mod.name});`);
    lines.push("");
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Static preamble (private state + helper functions)
// ---------------------------------------------------------------------------

const STATIC_PREAMBLE = `
  "use strict";

  // ---------------------------------------------------------------------------
  // Common function references
  // ---------------------------------------------------------------------------
  let _commonStringify = JSON.stringify;
  let _commonParse = JSON.parse;
  let _commonArrayCheck = Array.isArray;

  // ---------------------------------------------------------------------------
  // Private state
  // ---------------------------------------------------------------------------
  var _transport = null;
  var _transportSet = false;
  var _connecting = false;
  var _connected = false;
  var _fireboltInstance = null;
  var _connectionResolvers = [];
  var _nextId = 1;
  var _pendingCalls = Object.create(null);
  var _eventListeners = Object.create(null);
  var _extensionSchema = null;
  var _debug = false;
  var _VERSION = "9.0";

  // ---------------------------------------------------------------------------
  // Transport layer
  // ---------------------------------------------------------------------------
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
    if (message.id !== undefined) {
      var pending = _pendingCalls[message.id];
      if (!pending) return;
      delete _pendingCalls[message.id];

      if (message.error) {
        var errMsg = (message.error.message || "Firebolt error") + " (code: " + message.error.code + ")";
        if (pending.isSubscribe) {
          var listeners = _eventListeners[pending.eventName];
          if (listeners) {
            var idx = listeners.indexOf(pending.callback);
            if (idx !== -1) listeners.splice(idx, 1)
          }
        }
        pending.reject(new Error(errMsg));
        return
      }

      if (pending.isSubscribe) {
        pending.resolve(pending.unsubscribeFn);
        return
      }

      pending.resolve(message.result);
      return
    }
    if (message.method) {
      var eventName = message.method;
      var cbs = _eventListeners[eventName];
      if (cbs) {
        var payload = message.params && Object.prototype.hasOwnProperty.call(message.params, "value")
          ? message.params.value
          : message.params;
        for (var i = 0; i < cbs.length; i++) {
          cbs[i](payload)
        }
      }
    }
  }

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

  function _notConnectedError() {
    return new Error("Not connected");
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

  function _rpcCall(methodName, params) {
    if (!_connected) {
      return Promise.reject(_notConnectedError());
    }
    return new Promise(function(resolve, reject) {
      var id = _nextId++;
      _pendingCalls[id] = {
        isSubscribe: false,
        resolve,
        reject
      };
      var msg = _commonStringify({
        jsonrpc: "2.0",
        id,
        method: methodName,
        params: params || {}
      });
      _send(msg,(e) => {
        delete _pendingCalls[id];
        reject(e);
      });
    })
  }

  function _subscribe(eventName, callback) {
    if (!_connected) {
      return Promise.reject(_notConnectedError());
    }
    if (!_eventListeners[eventName]) {
      _eventListeners[eventName] = []
    }
    _eventListeners[eventName].push(callback);
    return new Promise(function(resolve, reject) {
      var id = _nextId++;

      function unsubscribeFn() {
        var ls = _eventListeners[eventName];
        if (ls) {
          var i = ls.indexOf(callback);
          if (i !== -1) ls.splice(i, 1)
        }
        if (!ls || ls.length === 0) {
          var unsubId = _nextId++;
          _pendingCalls[unsubId] = {
            isSubscribe: true,
            eventName,
            callback: null,
            unsubscribeFn: null,
            resolve: function(){},
            reject: function(){}
          };
          var unsubMsg = _commonStringify({
            jsonrpc: "2.0",
            id: unsubId,
            method: eventName,
            params: {
              listen: false
            }
          });
          _send(unsubMsg, (e) => {
            console.error("Failed to unsubscribe from event:", eventName, e);
          });
        }
      }

      _pendingCalls[id] = {
        isSubscribe: true,
        eventName,
        callback,
        unsubscribeFn,
        resolve,
        reject
      };

      var msg = _commonStringify({
        jsonrpc: "2.0",
        id,
        method: eventName,
        params: {
          listen: true
        }
      });
      _send(msg, (e) => {
        delete _pendingCalls[id];
        var ls = _eventListeners[eventName];
        if (ls) {
          var i = ls.indexOf(callback);
          if (i !== -1) ls.splice(i, 1)
        }
        reject(e);
      });
    })
  }

  // ---------------------------------------------------------------------------
  // Stub factories
  // ---------------------------------------------------------------------------
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

  function _addMethodWithPrimitiveWrap(module, methodName, moduleName, paramName) {
    Object.defineProperty(module, methodName, {
      value: function(primitiveValue) {
        return _rpcCall(moduleName + "." + methodName, { [paramName]: primitiveValue });
      },
      writable: false,
      enumerable: true,
      configurable: false
    })
  }

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

  function _registerModule(moduleName, module) {
    Object.defineProperty(_fireboltRegistry, moduleName, {
      value: module,
      writable: false,
      enumerable: true,
      configurable: false
    })
  }

  // ---------------------------------------------------------------------------
  // Extension schema loading
  // ---------------------------------------------------------------------------
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
            // Extension schemas can specify methodsWithPrimitiveWrap as array of { method, param } objects
            if (schema.methodsWithPrimitiveWrap && _commonArrayCheck(schema.methodsWithPrimitiveWrap)) {
              schema.methodsWithPrimitiveWrap.forEach(item => {
                if (item && item.method && item.param) {
                  var c = item.method;
                  if (fullcheck(moduleName, c)) {
                    _addMethodWithPrimitiveWrap(module, c, moduleName, item.param);
                    console.log("Extended Method " + c + " added to module " + moduleName + " with primitive-wrap pattern");
                  } else {
                    console.warn("Method " + c + " already exists in module " + moduleName);
                  }
                }
              });
            }
            if (!existingModule) {
              _registerModule(moduleName, module)
            }
          }
        }
      })
    }
  }

  // ---------------------------------------------------------------------------
  // Registry and instance building
  // ---------------------------------------------------------------------------
  var _fireboltRegistry = Object.create(null);

  function _buildFireboltInstance() {
    _addExtensions();
    _fireboltInstance = Object.freeze(_fireboltRegistry);
    return _fireboltInstance
  }

  function clearPendingCalls() {
    for (var id in _pendingCalls) {
      var pending = _pendingCalls[id];
      pending.reject(new Error("Disconnected"))
    }
    _pendingCalls = Object.create(null);
  }

  function clearEventListeners() {
    for (var eventName in _eventListeners) {
      for (var i = 0; i < _eventListeners[eventName].length; i++) {
        _eventListeners[eventName][i](null, false);
      }
    }
    _eventListeners = Object.create(null);
  }

  function reset() {
    clearEventListeners();
    clearPendingCalls();
    _connectionResolvers = [];
    _connected = false;
    _connecting = false;
  }
`;

// ---------------------------------------------------------------------------
// Static postamble (factory function return)
// ---------------------------------------------------------------------------

const STATIC_POSTAMBLE = `
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
  });

  var factory = function({
    transport,
    extensionSchema,
    enableDebug
  }) {
    if (!transport) {
      throw new Error("Transport is required")
    }
    if (typeof extensionSchema === "string" && extensionSchema.length > 0) {
      let parsedExtensionSchema = _commonParse(extensionSchema);
      if (_commonArrayCheck(parsedExtensionSchema)) {
        _extensionSchema = parsedExtensionSchema
      } else {
        console.warn("invalid extension after parsing")
      }
    }
  
    var requiredMethods = ["send", "open", "close"];
    for (var i = 0; i < requiredMethods.length; i++) {
      var method = requiredMethods[i];
      if (!transport[method]) {
        throw new Error("Transport object must have a '" + method + "' method. " + "Missing method: " + method);
      } else {
        if (typeof transport[method] === "function") {
          continue;
        } else {
          throw new Error("Transport object must have a '" + method + "' method. " + "Missing or invalid method: " + method);
        }
      }
    }
    _transport = transport;

    if (enableDebug && enableDebug === true) {
      _debug = true;
      window.___fireboltTransport___ = _transport;
    }
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
  };

  Object.defineProperty(global, "factory", {
    value: factory,
    writable: false,
    configurable: false,
    enumerable: true
  });

  return factory;
`;

// ---------------------------------------------------------------------------
// Assemble generate()
// ---------------------------------------------------------------------------

function generate(ast: CanonicalAST, _config: GenConfig): GeneratorOutput[] {
  // Filter to web + both platform modules only
  const webModules = ast.modules.filter(
    (m) => m.platform === "web" || m.platform === "both"
  );

  const staticModules = emitStaticModules(webModules);

  const content = [
    `(function(global) {`,
    STATIC_PREAMBLE,
    `  // --- Static module definitions ---`,
    staticModules,
    `  // --- End static module definitions ---`,
    STATIC_POSTAMBLE,
    `})(typeof globalThis !== "undefined" ? globalThis : window);`,
  ].join("\n");

  return [
    {
      filePath: "inject-js/firebolt-inject.js",
      content,
    },
  ];
}

// Register as a full-AST generator targeting the web platform
registerFullASTGenerator("inject-js", generate, "web");
