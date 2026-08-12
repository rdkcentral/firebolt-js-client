/**
 * inject-js FullASTGenerator.
 *
 * Emits a single self-contained ES5 IIFE bundle at generated/inject-js/firebolt-inject.js
 * that exposes window.FireboltServiceManager for use by the WPE Firebolt extension.
 *
 * Only web-platform modules (platform: "web" | "both") are included.
 *
 * The generated file has three sections:
 *   [STATIC PREAMBLE]   — private state, transport layer, stubs, configure, get
 *   [GENERATED DATA]    — _VERSION, _methodRegistry (synthesised from AST)
 *   [STATIC POSTAMBLE]  — Object.freeze + Object.defineProperty for FireboltServiceManager
 */

import {
  CanonicalAST,
  Module,
  NamedRef,
  OptionalRef,
  TypeDecl,
  TypeRef,
} from "../ast/types";
import { GenConfig, GeneratorOutput, registerFullASTGenerator } from "./index";



// ---------------------------------------------------------------------------
// Task 3.4 — isEventIsPrimitive
// ---------------------------------------------------------------------------

function isEventIsPrimitive(ref: TypeRef, types: TypeDecl[]): boolean {
  // Unwrap optional
  if (ref.kind === "optional") return isEventIsPrimitive((ref as OptionalRef).inner, types);
  // Primitive → wrap in params.value
  if (ref.kind === "primitive") return true;
  // Array → params IS the array
  if (ref.kind === "array") return false;
  // Named ref — look up the decl
  if (ref.kind === "named") {
    const nr = ref as NamedRef;
    const decl = types.find(t => t.name === nr.name);
    if (!decl) return true; // unknown — assume primitive-wrapped
    if (decl.kind === "object") return false;
    if (decl.kind === "array-alias") return false;
    // enum, scalar-alias, union → treated as primitive-wrapped
    return true;
  }
  return true;
}



// ---------------------------------------------------------------------------
// Task 3.6 — emitMethodRegistry
// ---------------------------------------------------------------------------


function emitMethodRegistry(modules: Module[]): string {
  const entries: string[] = [];

  for (const mod of modules) {
    for (const method of mod.methods) {
      const fullName = `${mod.name}.${method.name}`;

      if (method.kind === "call") {
        const entry = {
          kind: "call",
        };
        entries.push(`  ${JSON.stringify(fullName)}: ${JSON.stringify(entry)}`);
      } else {
        // subscribe
        const primitive = method.result ? isEventIsPrimitive(method.result, mod.types) : false;
        const entry = {
          kind: "subscribe",
          eventIsPrimitive: primitive,
        };
        entries.push(`  ${JSON.stringify(fullName)}: ${JSON.stringify(entry)}`);
      }
    }
  }

  if (entries.length === 0) return "var _methodRegistry = {};\n";
  return `var _methodRegistry = {\n${entries.join(",\n")}\n};\n`;
}

// ---------------------------------------------------------------------------
// Task 3.7 — emitVersionVar
// ---------------------------------------------------------------------------

function emitVersionVar(version: string): string {
  return `var _VERSION = ${JSON.stringify(version)};\n`;
}

// ---------------------------------------------------------------------------
// Task 3.8 — Static preamble (private state + validator)
// ---------------------------------------------------------------------------

const STATIC_PREAMBLE = `
  "use strict";

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
  var _pendingCalls = Object.create(null); // id → { isSubscribe, resolve, reject }
  var _eventListeners = Object.create(null); // "Module.onEvent" → [callbacks]
`;
// ---------------------------------------------------------------------------
// Task 3.9 — Static runtime (transport layer, stubs, configure, get)
// ---------------------------------------------------------------------------

const STATIC_RUNTIME = `
  // ---------------------------------------------------------------------------
  // Transport layer
  // ---------------------------------------------------------------------------
  function _onMessage(raw) {
    var message;
    try { message = JSON.parse(raw); } catch (e) { return; }

    // Has id → call response or subscribe ack
    if (message.id !== undefined) {
      var pending = _pendingCalls[message.id];
      if (!pending) return;
      delete _pendingCalls[message.id];

      if (message.error) {
        var errMsg = (message.error.message || "Firebolt error") + " (code: " + message.error.code + ")";
        if (pending.isSubscribe) {
          // Remove eagerly-registered listener on subscribe failure
          var listeners = _eventListeners[pending.eventName];
          if (listeners) {
            var idx = listeners.indexOf(pending.callback);
            if (idx !== -1) listeners.splice(idx, 1);
          }
        }
        pending.reject(new Error(errMsg));
        return;
      }

      if (pending.isSubscribe) {
        // result: null → subscription confirmed; resolve with unsubscribe fn
        pending.resolve(pending.unsubscribeFn);
        return;
      }

      // Regular call response
      pending.resolve(message.result);
      return;
    }

    // No id, has method → Firebolt 9 event notification
    if (message.method) {
      var eventName = message.method;
      var entry = _methodRegistry[eventName];
      if (!entry || entry.kind !== "subscribe") return;

      var payload = entry.eventIsPrimitive
        ? (message.params ? message.params.value : undefined)
        : message.params;

      var cbs = _eventListeners[eventName];
      if (cbs) {
        for (var i = 0; i < cbs.length; i++) { cbs[i](payload); }
      }
    }
  }

  function _onStatus(status) {
    _connected = (status === "connected");
    if (_connected) {
      if (!_fireboltInstance) { _fireboltInstance = _buildFireboltInstance(); }
      var resolvers = _connectionResolvers.splice(0);
      for (var i = 0; i < resolvers.length; i++) { resolvers[i](_fireboltInstance); }
    }
  }

  function _rpcCall(methodName, params) {
    return new Promise(function (resolve, reject) {
      var id = _nextId++;
      _pendingCalls[id] = {
        isSubscribe: false,
        resolve: resolve,
        reject: reject,
      };
      var msg = JSON.stringify({ jsonrpc: "2.0", id: id, method: methodName, params: params || {} });
      var result = _transport.send(msg);
      if (!result.success) {
        delete _pendingCalls[id];
        reject(new Error("Transport send failed (errorCode: " + result.errorCode + ")"));
      }
    });
  }

  function _subscribe(eventName, callback) {
    if (!_eventListeners[eventName]) { _eventListeners[eventName] = []; }
    _eventListeners[eventName].push(callback); // eager registration

    return new Promise(function (resolve, reject) {
      var id = _nextId++;

      function unsubscribeFn() {
        var ls = _eventListeners[eventName];
        if (ls) {
          var i = ls.indexOf(callback);
          if (i !== -1) ls.splice(i, 1);
        }
        if (!ls || ls.length === 0) {
          var unsubId = _nextId++;
          _pendingCalls[unsubId] = { isSubscribe: true, eventName: eventName, callback: null, unsubscribeFn: null, resolve: function(){}, reject: function(){} };
          var unsubMsg = JSON.stringify({ jsonrpc: "2.0", id: unsubId, method: eventName, params: { listen: false } });
          _transport.send(unsubMsg);
        }
      }

      _pendingCalls[id] = {
        isSubscribe: true,
        eventName: eventName,
        callback: callback,
        unsubscribeFn: unsubscribeFn,
        resolve: resolve,
        reject: reject,
      };

      var msg = JSON.stringify({ jsonrpc: "2.0", id: id, method: eventName, params: { listen: true } });
      var result = _transport.send(msg);
      if (!result.success) {
        delete _pendingCalls[id];
        var ls = _eventListeners[eventName];
        if (ls) { var i = ls.indexOf(callback); if (i !== -1) ls.splice(i, 1); }
        reject(new Error("Transport send failed (errorCode: " + result.errorCode + ")"));
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Stub factories
  // ---------------------------------------------------------------------------
  function _makeCallStub(fullMethodName) {
    return function (params) {
      return _rpcCall(fullMethodName, params || {});
    };
  }

  function _makeSubscribeStub(fullMethodName) {
    return function (callback) {
      return _subscribe(fullMethodName, callback);
    };
  }

  // ---------------------------------------------------------------------------
  // FireboltClient builder
  // ---------------------------------------------------------------------------
  function _buildFireboltInstance() {
    var modules = Object.create(null);
    for (var fullName in _methodRegistry) {
      var dotIdx = fullName.indexOf(".");
      var modName = fullName.slice(0, dotIdx);
      var methodName = fullName.slice(dotIdx + 1);
      var desc = _methodRegistry[fullName];
      if (!modules[modName]) { modules[modName] = Object.create(null); }
      modules[modName][methodName] = desc.kind === "subscribe"
        ? _makeSubscribeStub(fullName)
        : _makeCallStub(fullName);
    }
    var client = Object.create(null);
    for (var mod in modules) { client[mod] = Object.freeze(modules[mod]); }
    // Add disconnect method
    client.disconnect = function() {
      _disconnect();
      _fireboltInstance = null;
    };
    return Object.freeze(client);
  }

  // ---------------------------------------------------------------------------
  // Disconnect handler
  // ---------------------------------------------------------------------------
  function _disconnect() {
    // Call transport disconnect
    if (_transport && _transport.disconnect) {
      _transport.disconnect();
    }
    // Clear event listeners
    for (var key in _eventListeners) {
      _eventListeners[key] = [];
    }
    // Reject all pending calls with DisconnectError
    for (var id in _pendingCalls) {
      var pending = _pendingCalls[id];
      pending.reject(new Error("Disconnected"));
    }
    _pendingCalls = Object.create(null);
    // Clear pending connection resolvers
    _connectionResolvers = [];
    // Reset state
    _connected = false;
    _connecting = false;
    _fireboltInstance = null;
  }

  // ---------------------------------------------------------------------------
  // configure / get
  // ---------------------------------------------------------------------------
  function _setTransport(transport) {
    if (_transportSet) {
      throw new Error("Transport already set on FireboltServiceManager");
    }
    
    // Validate that transport has all required methods
    var requiredMethods = ["send", "onMessage", "onConnectionStatus", "connect", "disconnect"];
    for (var i = 0; i < requiredMethods.length; i++) {
      var method = requiredMethods[i];
      if (typeof transport[method] !== "function") {
        throw new Error(
          "Transport object must have a '" + method + "' method. " +
          "Missing or invalid method: " + method
        );
      }
    }
    
    _transport = transport;
    _transportSet = true;
  }

  function _get() {
    if (!_transport) {
      throw new Error(
        "Transport not set via FireboltServiceManager.transport(). " +
        "The WPE extension must call FireboltServiceManager.transport(t) first."
      );
    }
    if (_connected && _fireboltInstance) { return Promise.resolve(_fireboltInstance); }
    var p = new Promise(function (resolve) { _connectionResolvers.push(resolve); });
    if (!_connecting) {
      _connecting = true;
      _transport.onMessage(_onMessage);
      _transport.onConnectionStatus(_onStatus);
      _transport.connect();
    }
    return p;
  }
`;

// ---------------------------------------------------------------------------
// Task 3.10 — Static postamble (FireboltServiceManager freeze + defineProperty)
// ---------------------------------------------------------------------------

const STATIC_POSTAMBLE = `
  var _fsm = Object.freeze({
    version: _VERSION,
    transport: _setTransport,
    get: _get,
  });
  Object.defineProperty(global, "FireboltServiceManager", {
    value: _fsm,
    writable: false,
    configurable: false,
    enumerable: true,
  });
`;

// ---------------------------------------------------------------------------
// Task 3.11 — Assemble generate()
// ---------------------------------------------------------------------------

function generate(ast: CanonicalAST, _config: GenConfig): GeneratorOutput[] {
  // Filter to web + both platform modules only
  const webModules = ast.modules.filter(
    (m) => m.platform === "web" || m.platform === "both"
  );

  const generatedData = [
    emitVersionVar(ast.version),
    emitMethodRegistry(webModules),
  ].join("\n");

  const content = [
    `(function(global) {`,
    STATIC_PREAMBLE,
    `  // --- Generated data ---`,
    generatedData.split("\n").map((l) => `  ${l}`).join("\n"),
    `  // --- End generated data ---`,
    STATIC_RUNTIME,
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
