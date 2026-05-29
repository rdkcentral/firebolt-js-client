/**
 * inject-js FullASTGenerator.
 *
 * Emits a single self-contained ES5 IIFE bundle at out/inject-js/firebolt-inject.js
 * that exposes window.FireboltServiceManager for use by the WPE Firebolt extension.
 *
 * Only web-platform modules (platform: "web" | "both") are included.
 *
 * The generated file has three sections:
 *   [STATIC PREAMBLE]   — private state, validator, transport layer, stubs, configure, get
 *   [GENERATED DATA]    — _VERSION, _typeSchemas, _methodRegistry (synthesised from AST)
 *   [STATIC POSTAMBLE]  — Object.freeze + Object.defineProperty for FireboltServiceManager
 */

import {
  ArrayRef,
  CanonicalAST,
  EnumTypeDecl,
  Method,
  Module,
  NamedRef,
  ObjectTypeDecl,
  OptionalRef,
  PrimitiveRef,
  ScalarAliasDecl,
  TypeDecl,
  TypeRef,
  UnionTypeDecl,
  ArrayAliasDecl,
} from "../ast/types";
import { GenConfig, GeneratorOutput, registerFullASTGenerator } from "./index";

// ---------------------------------------------------------------------------
// Schema node types (runtime representation emitted into the bundle)
// ---------------------------------------------------------------------------

type SchemaNode =
  | { kind: "primitive"; type: "bool" | "string" | "number"; constraints?: Record<string, unknown> }
  | { kind: "ref"; name: string }
  | { kind: "object"; properties: Record<string, SchemaNode>; required: string[] }
  | { kind: "array"; items: SchemaNode }
  | { kind: "optional"; inner: SchemaNode }
  | { kind: "union"; variants: SchemaNode[] }
  | { kind: "enum"; values: string[] }
  | { kind: "null" };

// ---------------------------------------------------------------------------
// Task 3.2 — typeRefToSchemaNode
// ---------------------------------------------------------------------------

function typeRefToSchemaNode(ref: TypeRef, moduleName: string, types: TypeDecl[]): SchemaNode {
  switch (ref.kind) {
    case "primitive": {
      const pr = ref as PrimitiveRef;
      const type: "bool" | "string" | "number" =
        pr.primitive === "bool" ? "bool" :
        pr.primitive === "string" ? "string" : "number";
      const node: SchemaNode = { kind: "primitive", type };
      if (pr.constraints) {
        const c: Record<string, unknown> = {};
        if (pr.constraints.minLength !== undefined) c.minLength = pr.constraints.minLength;
        if (pr.constraints.maxLength !== undefined) c.maxLength = pr.constraints.maxLength;
        if (pr.constraints.pattern   !== undefined) c.pattern   = pr.constraints.pattern;
        if (pr.constraints.minimum   !== undefined) c.minimum   = pr.constraints.minimum;
        if (pr.constraints.maximum   !== undefined) c.maximum   = pr.constraints.maximum;
        if (Object.keys(c).length > 0) (node as { kind: "primitive"; type: string; constraints?: Record<string, unknown> }).constraints = c;
      }
      return node;
    }
    case "named": {
      const nr = ref as NamedRef;
      const qualifiedName = nr.module ? `${nr.module}.${nr.name}` : `${moduleName}.${nr.name}`;
      return { kind: "ref", name: qualifiedName };
    }
    case "array": {
      const ar = ref as ArrayRef;
      return { kind: "array", items: typeRefToSchemaNode(ar.items, moduleName, types) };
    }
    case "optional": {
      const or = ref as OptionalRef;
      return { kind: "optional", inner: typeRefToSchemaNode(or.inner, moduleName, types) };
    }
  }
}

// ---------------------------------------------------------------------------
// Task 3.3 — typeDeclToSchemaNode
// ---------------------------------------------------------------------------

function typeDeclToSchemaNode(decl: TypeDecl, moduleName: string, allTypes: TypeDecl[]): SchemaNode {
  switch (decl.kind) {
    case "enum": {
      const ed = decl as EnumTypeDecl;
      return { kind: "enum", values: ed.values.map(v => v.serializedId) };
    }
    case "object": {
      const od = decl as ObjectTypeDecl;
      const properties: Record<string, SchemaNode> = {};
      const required: string[] = [];
      for (const prop of od.properties) {
        properties[prop.name] = typeRefToSchemaNode(prop.type, moduleName, allTypes);
        if (prop.required) required.push(prop.name);
      }
      return { kind: "object", properties, required };
    }
    case "union": {
      const ud = decl as UnionTypeDecl;
      return {
        kind: "union",
        variants: ud.variants.map(v => typeRefToSchemaNode(v, moduleName, allTypes)),
      };
    }
    case "scalar-alias": {
      const sd = decl as ScalarAliasDecl;
      return typeRefToSchemaNode(sd.target, moduleName, allTypes);
    }
    case "array-alias": {
      const ad = decl as ArrayAliasDecl;
      return { kind: "array", items: typeRefToSchemaNode(ad.items, moduleName, allTypes) };
    }
  }
}

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
// Task 3.5 — collectTypeSchemas
// ---------------------------------------------------------------------------

function collectTypeSchemas(modules: Module[]): string {
  const entries: string[] = [];

  for (const mod of modules) {
    const allTypes = mod.types;
    for (const decl of mod.types) {
      const key = `${mod.name}.${decl.name}`;
      const schemaNode = typeDeclToSchemaNode(decl, mod.name, allTypes);
      entries.push(`  ${JSON.stringify(key)}: ${JSON.stringify(schemaNode)}`);
    }
  }

  if (entries.length === 0) return "var _typeSchemas = {};\n";
  return `var _typeSchemas = {\n${entries.join(",\n")}\n};\n`;
}

// ---------------------------------------------------------------------------
// Task 3.6 — emitMethodRegistry
// ---------------------------------------------------------------------------

function methodParamsSchema(method: Method, moduleName: string, types: TypeDecl[]): SchemaNode | null {
  if (method.params.length === 0) return null;
  const properties: Record<string, SchemaNode> = {};
  const required: string[] = [];
  for (const p of method.params) {
    properties[p.name] = typeRefToSchemaNode(p.type, moduleName, types);
    if (p.type.kind !== "optional") required.push(p.name);
  }
  return { kind: "object", properties, required };
}

function emitMethodRegistry(modules: Module[]): string {
  const entries: string[] = [];

  for (const mod of modules) {
    for (const method of mod.methods) {
      const fullName = `${mod.name}.${method.name}`;

      if (method.kind === "call") {
        const ps = methodParamsSchema(method, mod.name, mod.types);
        const rs: SchemaNode = method.result
          ? typeRefToSchemaNode(method.result, mod.name, mod.types)
          : { kind: "null" };
        const entry = {
          kind: "call",
          paramsSchema: ps,
          resultSchema: rs,
        };
        entries.push(`  ${JSON.stringify(fullName)}: ${JSON.stringify(entry)}`);
      } else {
        // subscribe
        const eventSchema: SchemaNode = method.result
          ? typeRefToSchemaNode(method.result, mod.name, mod.types)
          : { kind: "null" };
        const primitive = method.result ? isEventIsPrimitive(method.result, mod.types) : false;
        const entry = {
          kind: "subscribe",
          eventIsPrimitive: primitive,
          eventSchema,
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
  var _clientId = null;
  var _connecting = false;
  var _connected = false;
  var _fireboltInstance = null;
  var _connectionResolvers = [];
  var _nextId = 1;
  var _pendingCalls = Object.create(null); // id → { isSubscribe, resolve, reject, [resultSchema] }
  var _eventListeners = Object.create(null); // "Module.onEvent" → [callbacks]

  // ---------------------------------------------------------------------------
  // Schema validator
  // ---------------------------------------------------------------------------
  function _resolveRef(name) {
    return _typeSchemas[name] || null;
  }

  function _validate(value, schema) {
    if (!schema || schema.kind === "null") return null;
    switch (schema.kind) {
      case "primitive":   return _validatePrimitive(value, schema);
      case "ref":         return _validate(value, _resolveRef(schema.name));
      case "object":      return _validateObject(value, schema);
      case "array":       return _validateArray(value, schema);
      case "optional":    return (value === null || value === undefined) ? null : _validate(value, schema.inner);
      case "union":       return _validateUnion(value, schema);
      case "enum":        return _validateEnum(value, schema);
      default:            return null;
    }
  }

  function _validatePrimitive(value, schema) {
    if (schema.type === "bool"   && typeof value !== "boolean") return "expected boolean, got " + typeof value;
    if (schema.type === "string" && typeof value !== "string")  return "expected string, got " + typeof value;
    if (schema.type === "number" && typeof value !== "number")  return "expected number, got " + typeof value;
    if (schema.type === "string" && schema.constraints) {
      var c = schema.constraints;
      if (c.minLength !== undefined && value.length < c.minLength)
        return "minLength violation: " + value.length + " < " + c.minLength;
      if (c.maxLength !== undefined && value.length > c.maxLength)
        return "maxLength violation: " + value.length + " > " + c.maxLength;
      if (c.pattern !== undefined && !(new RegExp(c.pattern)).test(value))
        return "pattern violation: " + c.pattern;
    }
    if ((schema.type === "number") && schema.constraints) {
      var cn = schema.constraints;
      if (cn.minimum !== undefined && value < cn.minimum)
        return "minimum violation: " + value + " < " + cn.minimum;
      if (cn.maximum !== undefined && value > cn.maximum)
        return "maximum violation: " + value + " > " + cn.maximum;
    }
    return null;
  }

  function _validateObject(value, schema) {
    if (typeof value !== "object" || value === null || Array.isArray(value))
      return "expected object";
    var required = schema.required || [];
    for (var i = 0; i < required.length; i++) {
      if (!(required[i] in value)) return required[i] + ": required field missing";
    }
    var props = schema.properties || {};
    for (var key in props) {
      if (key in value) {
        var err = _validate(value[key], props[key]);
        if (err) return key + ": " + err;
      }
    }
    return null;
  }

  function _validateArray(value, schema) {
    if (!Array.isArray(value)) return "expected array";
    for (var i = 0; i < value.length; i++) {
      var err = _validate(value[i], schema.items);
      if (err) return "[" + i + "]: " + err;
    }
    return null;
  }

  function _validateUnion(value, schema) {
    var variants = schema.variants || [];
    for (var i = 0; i < variants.length; i++) {
      if (_validate(value, variants[i]) === null) return null;
    }
    return "no union variant matched";
  }

  function _validateEnum(value, schema) {
    var values = schema.values || [];
    for (var i = 0; i < values.length; i++) {
      if (value === values[i]) return null;
    }
    return "expected one of [" + values.join(", ") + "], got " + JSON.stringify(value);
  }
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

      // Regular call response — validate result
      if (pending.resultSchema) {
        var valErr = _validate(message.result, pending.resultSchema);
        if (valErr) {
          pending.reject(new Error("Invalid result from " + pending.methodName + ": " + valErr));
          return;
        }
      }
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

      if (entry.eventSchema) {
        var evErr = _validate(payload, entry.eventSchema);
        if (evErr) {
          console.warn("Firebolt: invalid event payload for " + eventName + ": " + evErr);
          return;
        }
      }

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
    var entry = _methodRegistry[methodName];
    if (entry && entry.paramsSchema) {
      var pErr = _validate(params, entry.paramsSchema);
      if (pErr) return Promise.reject(new Error("Invalid params for " + methodName + ": " + pErr));
    }
    return new Promise(function (resolve, reject) {
      var id = _nextId++;
      var t = window.__firebolt_transport__;
      _pendingCalls[id] = {
        isSubscribe: false,
        methodName: methodName,
        resultSchema: entry ? entry.resultSchema : null,
        resolve: resolve,
        reject: reject,
      };
      var msg = JSON.stringify({ jsonrpc: "2.0", id: id, method: methodName, params: params || {} });
      var result = t.send(_clientId, msg);
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
      var t = window.__firebolt_transport__;

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
          t.send(_clientId, unsubMsg);
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
      var result = t.send(_clientId, msg);
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
    return Object.freeze(client);
  }

  // ---------------------------------------------------------------------------
  // configure / get
  // ---------------------------------------------------------------------------
  function _configure(config) {
    _clientId = config.clientId;
  }

  function _get() {
    if (!_clientId) {
      throw new Error(
        "FireboltServiceManager.get() called before configure(). " +
        "The WPE extension must call configure({ clientId }) first."
      );
    }
    if (_connected && _fireboltInstance) { return Promise.resolve(_fireboltInstance); }
    var p = new Promise(function (resolve) { _connectionResolvers.push(resolve); });
    if (!_connecting) {
      _connecting = true;
      var t = window.__firebolt_transport__;
      t.onMessage(_clientId, _onMessage);
      t.onConnectionStatus(_clientId, _onStatus);
      t.connect(_clientId);
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
    configure: _configure,
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
    collectTypeSchemas(webModules),
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
