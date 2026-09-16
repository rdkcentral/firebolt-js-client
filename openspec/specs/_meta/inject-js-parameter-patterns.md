# Inject-JS Parameter Patterns

This document defines the parameter patterns used in the inject-js generator for Firebolt method stubs.

## Overview

The inject-js generator produces JavaScript method stubs that wrap JSON-RPC calls. Different methods have different parameter signatures, and the generator should produce appropriate stubs for each pattern.

## Supported Patterns

### Pattern 1: No Parameters

Methods that take no parameters should be invoked without any arguments.

**Usage:**
```javascript
Accessibility.audioDescription()
```

**Generated Stub:**
```javascript
function _makeCallStubNoParams(fullMethodName) {
  return function() {
    return _rpcCall(fullMethodName, {});
  };
}
```

**Method Registry Entry:**
```javascript
"Accessibility.audioDescription": {"kind":"call", "paramCount": 0}
```

**Applicability:**
- Methods with `params.length === 0`
- Methods where all parameters are optional with no defaults

### Pattern 2: Single Parameter (Primitive or Object)

Methods that take one or more parameters should accept a single parameter that can be either a primitive value or an object containing all parameters.

**Usage:**
```javascript
// Single primitive parameter
Discovery.watched("entity123")

// Single object parameter
Actions.start({ intent: "watch", handlerAppId: "app123" })
```

**TypeScript Definition:**
```typescript
// For single primitive parameter
function watched(params: string): Promise<void>;

// For single object parameter
interface ActionsStartParams {
  intent: string;
  handlerAppId?: string;
}
function start(params: ActionsStartParams): Promise<void>;
```

**Generated Stub:**
```javascript
function _makeCallStub(fullMethodName) {
  return function(param) {
    return _rpcCall(fullMethodName, param || {});
  };
}
```

**Method Registry Entry:**
```javascript
"Discovery.watched": {"kind":"call", "paramCount": 1}
"Actions.start": {"kind":"call", "paramCount": 2}
```

**Applicability:**
- Methods with `params.length >= 1`
- The single parameter accepts either:
  - A primitive value (string, number, boolean) for single-parameter methods
  - An object containing all named parameters for multi-parameter methods

### Pattern 3: Event Callbacks with Cancellation

Event subscription methods use callbacks that accept two parameters: the event payload and a cancellation flag.

**Usage:**
```javascript
Actions.onIntent((event, cancelled) => {
  if (cancelled) {
    console.log("Event subscription was cancelled");
    return;
  }
  console.log("Intent received:", event);
});
```

**TypeScript Definition:**
```typescript
function onIntent(callback: (event: IntentPayload, cancelled: boolean) => void): () => void;
```

**Event Callback Signature:**
- First parameter: Event payload (the actual event data)
- Second parameter: Cancellation flag (boolean, true when subscription is cancelled due to connection failure)

**Applicability:**
- All `kind: "subscribe"` methods
- The cancelled parameter is true when event listeners are cleared due to connection failures

## Pattern Selection Logic

The generator should categorize methods based on their parameter count and kind:

```typescript
function getParamPattern(method: Method): "no-params" | "single-param" {
  if (method.params.length === 0) {
    return "no-params";
  }
  return "single-param";
}

function getEventCallbackPattern(method: Method): "single-param" | "two-param" {
  // All subscribe methods use two-parameter callback signature
  if (method.kind === "subscribe") {
    return "two-param";
  }
  return "single-param";
}
```

## Rationale

### Why Two Patterns?

1. **Ergonomics:** Methods with no parameters are cleaner to call without empty objects
2. **Consistency:** All methods with parameters use the same single-parameter pattern
3. **JSON-RPC Alignment:** The single-parameter pattern aligns with JSON-RPC's `params` object
4. **Type Safety:** TypeScript definitions can accurately reflect the parameter structure

### Why Not Named Arguments Pattern?

The webkit extension in `feat/fireboltweb` includes a third pattern that accepts named parameters as separate positional arguments:

```javascript
_addMethod(_actionsModule, "start", "Actions", ["intent", "handleAppId"]);
// Usage: Actions.start(intent, handleAppId)
```

This pattern is **not adopted** for the inject-js generator because:

1. **Parameter Order Sensitivity:** Positional arguments require correct parameter order
2. **Breaking Changes:** Adding new parameters becomes a breaking change
3. **JSON-RPC Mismatch:** JSON-RPC uses named parameters in an object, not positional
4. **Complexity:** Requires additional metadata and parameter ordering logic

## Implementation Notes

### Method Registry Enhancement

The `_methodRegistry` should include parameter count metadata:

```javascript
var _methodRegistry = {
  "Accessibility.audioDescription": {"kind":"call", "paramCount": 0},
  "Discovery.watched": {"kind":"call", "paramCount": 1},
  "Actions.start": {"kind":"call", "paramCount": 2},
  "Localization.onCountryChanged": {"kind":"subscribe", "eventIsPrimitive": true}
};
```

### Stub Factory Functions

Two stub factory functions are needed:

```javascript
function _makeCallStubNoParams(fullMethodName) {
  return function() {
    return _rpcCall(fullMethodName, {});
  };
}

function _makeCallStub(fullMethodName) {
  return function(param) {
    return _rpcCall(fullMethodName, param || {});
  };
}
```

### Instance Building Logic

The `_buildFireboltInstance` function should select the appropriate stub factory:

```javascript
function _buildFireboltInstance() {
  var modules = Object.create(null);
  for (var fullName in _methodRegistry) {
    var dotIdx = fullName.indexOf(".");
    var modName = fullName.slice(0, dotIdx);
    var methodName = fullName.slice(dotIdx + 1);
    var desc = _methodRegistry[fullName];
    if (!modules[modName]) { modules[modName] = Object.create(null); }
    
    if (desc.kind === "subscribe") {
      modules[modName][methodName] = _makeSubscribeStub(fullName);
    } else if (desc.paramCount === 0) {
      modules[modName][methodName] = _makeCallStubNoParams(fullName);
    } else {
      modules[modName][methodName] = _makeCallStub(fullName);
    }
  }
  // ... rest of the function
}
```

## Examples

### No-Params Method

**AST:**
```typescript
{
  name: "audioDescription",
  kind: "call",
  params: [],
  result: { kind: "primitive", primitive: "boolean" }
}
```

**Generated Registry:**
```javascript
"Accessibility.audioDescription": {"kind":"call", "paramCount": 0}
```

**Generated Stub:**
```javascript
Accessibility.audioDescription = function() {
  return _rpcCall("Accessibility.audioDescription", {});
};
```

**Usage:**
```javascript
const isEnabled = await Accessibility.audioDescription();
```

### Single-Param Method (Primitive)

**AST:**
```typescript
{
  name: "watched",
  kind: "call",
  params: [
    { name: "entityId", type: { kind: "primitive", primitive: "string" }, required: true }
  ],
  result: { kind: "null" }
}
```

**Generated Registry:**
```javascript
"Discovery.watched": {"kind":"call", "paramCount": 1}
```

**Generated Stub:**
```javascript
Discovery.watched = function(param) {
  return _rpcCall("Discovery.watched", param || {});
};
```

**Usage:**
```javascript
await Discovery.watched("entity123");
```

### Single-Param Method (Object)

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

**Generated Registry:**
```javascript
"Actions.start": {"kind":"call", "paramCount": 2}
```

**Generated Stub:**
```javascript
Actions.start = function(param) {
  return _rpcCall("Actions.start", param || {});
};
```

**Usage:**
```javascript
await Actions.start({ intent: "watch", handlerAppId: "app123" });
```

## Migration Path

Since there are no current developers using the TypeScript definitions, this is a clean breaking change. The migration path for future developers is:

### For Call Methods

**Old pattern (positional parameters):**
```typescript
Actions.start("watch", "app123")
Discovery.watched("entity123", 0.5, false, "2026-09-15", "app:adult")
```

**New pattern (object parameters):**
```typescript
Actions.start({ intent: "watch", handlerAppId: "app123" })
Discovery.watched({ entityId: "entity123", progress: 0.5, completed: false, watchedOn: "2026-09-15", agePolicy: "app:adult" })
```

### For Event Callbacks

**Old pattern (single parameter):**
```typescript
Actions.onIntent((event) => {
  console.log("Intent received:", event);
});
```

**New pattern (two parameters with cancellation):**
```typescript
Actions.onIntent((event, cancelled) => {
  if (cancelled) {
    console.log("Event subscription was cancelled");
    return;
  }
  console.log("Intent received:", event);
});
```

## References

- Current implementation: `src/generators/inject-js.ts`
- Webkit extension reference: `webkitExtension/resources/firebolt-builder.js` (feat/fireboltweb branch)
- Generator conventions: `openspec/specs/_meta/generator-conventions.md`
- Inject-js spec: `openspec/specs/wpe-inject-js-generator/spec.md`
