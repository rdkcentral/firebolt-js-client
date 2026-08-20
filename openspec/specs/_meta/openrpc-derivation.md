# OpenRPC Derivation Rules

> **Meta-guideline.** This document defines the rules by which an AI assistant
> derives OpenRPC JSON from an OpenSpec module spec. The derivation must be
> deterministic: the same spec always produces the same OpenRPC output.
> Human review validates the derived output before it is committed.

---

## Overview

OpenRPC is the formal JSON-RPC contract layer. It answers: *"What exactly is this API?"*

The derivation process reads one or more `spec.md` files and produces one or more
`openrpc/<module>.json` files that are:
- Fully valid OpenRPC 1.2.x documents
- JSON-RPC 2.0 compliant
- Validated against a schema validator before acceptance

```
openspec/specs/<module>/spec.md
      │
      ▼  (AI-assisted derivation + human review)
openrpc/<module>.json
```

---

## Shared Schemas

Before any module derivation, two shared schemas are available to all modules.
They must be referenced rather than re-declared:

| Schema name        | Source                               | Purpose                              |
|--------------------|--------------------------------------|--------------------------------------|
| `ListenResponse`   | `openspec/specs/shared/spec.md`      | Subscribe confirmation payload       |
| `FireboltError`    | `openspec/specs/shared/spec.md`      | Error carrier (JSON-RPC aligned)     |

In OpenRPC JSON, reference them as:
```json
{ "$ref": "shared.json#/components/schemas/ListenResponse" }
{ "$ref": "shared.json#/components/schemas/FireboltError" }
```

---

## Derivation Rules by Spec Section

### 1. `types:` → `components/schemas`

Each type declared in `types:` maps directly to a JSON Schema entry in `components/schemas`.

**`kind: enum`**
```json
"AudioProfile": {
  "title": "AudioProfile",
  "type": "string",
  "enum": ["stereo", "dolbyDigital5.1", "dolbyAtmos"],
  "description": "An audio encoding profile supported by the device hardware."
}
```

**`kind: object`**
```json
"StateChangedEvent": {
  "title": "StateChangedEvent",
  "type": "object",
  "description": "Payload for a lifecycle state transition notification.",
  "properties": {
    "oldState": { "$ref": "#/components/schemas/LifecycleState" },
    "newState": { "$ref": "#/components/schemas/LifecycleState" }
  },
  "required": ["oldState", "newState"]
}
```

Rules:
- `required: true` fields contribute to the JSON Schema `required` array.
- `required: false` fields are omitted from the `required` array (they remain in `properties`).
- `$ref` types use the local `#/components/schemas/<Name>` path within the same module file.
- Shared type `$ref` uses the cross-file path `shared.json#/components/schemas/<Name>`.

### 2. Primitive Type Mapping

| Spec type  | JSON Schema                                     |
|------------|-------------------------------------------------|
| `bool`     | `{ "type": "boolean" }`                         |
| `string`   | `{ "type": "string" }`                          |
| `unsigned` | `{ "type": "integer", "minimum": 0 }`           |
| `double`   | `{ "type": "number", "format": "double" }`      |
| `none`     | `{ "type": "null" }` (result only)              |

### 3. Format Annotation Mapping

| Spec format    | JSON Schema addition                  |
|----------------|---------------------------------------|
| `date-time`    | `"format": "date-time"` appended to `string` schema |

### 3a. String Constraint Mapping (Rule 7)

When a spec declares `minLength`, `maxLength`, or `pattern` on a `string` type,
these map **verbatim** to the JSON Schema keywords of the same name.

**Derivation:**

```yaml
# Spec
type: string
minLength: 2
maxLength: 2
pattern: "^[A-Z]{2}$"
```

```json
// OpenRPC → JSON Schema
{
  "type": "string",
  "minLength": 2,
  "maxLength": 2,
  "pattern": "^[A-Z]{2}$"
}
```

**Rules for string constraints in OpenRPC:**
- All three keywords are optional and independent.
- `pattern` must be an ECMAScript (ECMA 262) regular expression — JSON Schema 
  `pattern` keyword does not support POSIX classes.
- For subscribe event payloads, constraints go on the inline schema inside `oneOf`,
  not on the `ListenResponse` variant.
- String constraints in `components/schemas` named types are also carried verbatim.
- The AST builder (Rule 7) reads all three keywords and stores them on `PrimitiveRef.constraints`.

**Example — ISO 3166-1 alpha-2 country code as a subscribe payload:**

```json
{
  "name": "Localization.onCountryChanged",
  "params": [
    { "name": "listen", "required": true, "schema": { "type": "boolean" } }
  ],
  "result": {
    "name": "result",
    "schema": {
      "oneOf": [
        { "$ref": "shared.json#/components/schemas/ListenResponse" },
        {
          "type": "string",
          "minLength": 2,
          "maxLength": 2,
          "pattern": "^[A-Z]{2}$",
          "description": "ISO 3166-1 alpha-2 country code"
        }
      ]
    }
  }
}
```

---

### 3b. Numeric Constraint Mapping (Rule 7)

When a spec declares `minimum` or `maximum` on a `double` or `unsigned` type,
these map **verbatim** to the JSON Schema keywords of the same name.

**Derivation:**

```yaml
# Spec
type: double
minimum: 0.1
maximum: 10
```

```json
// OpenRPC → JSON Schema
{
  "type": "number",
  "format": "double",
  "minimum": 0.1,
  "maximum": 10
}
```

**Rules for numeric constraints in OpenRPC:**
- Both keywords are optional and independent.
- `minimum` and `maximum` are **inclusive** bounds (JSON Schema semantics).
- Constraints on named type properties are placed directly on the property schema
  inside `components/schemas`.
- The AST builder (Rule 7) reads both keywords and stores them on
  `PrimitiveRef.constraints` for `double` and `unsigned` primitives.

**Example — voice guidance rate on a named object type:**

```json
{
  "components": {
    "schemas": {
      "VoiceGuidanceSettings": {
        "type": "object",
        "properties": {
          "enabled":         { "type": "boolean" },
          "rate":            { "type": "number", "format": "double",
                               "minimum": 0.1, "maximum": 10,
                               "description": "Speech rate; 1.0 = normal" },
          "navigationHints": { "type": "boolean" }
        },
        "required": ["enabled", "rate", "navigationHints"]
      }
    }
  }
}
```

### 4. `properties:` → Method(s)

Each property generates 1, 2, or 3 OpenRPC methods depending on `writable`.

#### Getter (always generated)

Method name: `<Module>.<propertyName>`

```json
{
  "name": "Device.audioDescription",
  "summary": "<description first line>",
  "params": [],
  "result": {
    "name": "result",
    "schema": { "type": "boolean" }
  },
  "examples": [...]
}
```

#### Setter (generated only when `writable: true`)

Method name: `<Module>.set<PropertyName>` (PascalCase the property name)

```json
{
  "name": "Localization.setLanguage",
  "summary": "Sets the preferred language.",
  "params": [
    {
      "name": "value",
      "required": true,
      "schema": { "type": "string" }
    }
  ],
  "result": {
    "name": "result",
    "schema": { "type": "null" }
  }
}
```

#### onChange Subscription (always generated)

Method name: `<Module>.on<PropertyName>Changed` (PascalCase the property name)

This is a **subscribe method**. Apply the subscribe derivation rules (see section 5).
The event payload type is identical to the getter result type.

```json
{
  "name": "Device.onAudioDescriptionChanged",
  "summary": "Subscribe to audio description setting changes.",
  "tags": [{ "name": "subscribe" }],
  "params": [
    {
      "name": "listen",
      "required": true,
      "schema": { "type": "boolean" },
      "description": "Pass true to subscribe, false to unsubscribe"
    }
  ],
  "result": {
    "name": "result",
    "schema": {
      "oneOf": [
        { "$ref": "shared.json#/components/schemas/ListenResponse" },
        { "type": "boolean" }
      ]
    }
  }
}
```

### 5. `actions:` → Method

Method name: `<Module>.<actionName>`

Params are mapped from the spec `params:` array in order. Each param becomes
a content descriptor with `required` set appropriately.

```json
{
  "name": "Discovery.watched",
  "summary": "Notify the platform that content has been watched.",
  "params": [
    {
      "name": "entityId",
      "required": true,
      "schema": { "type": "string" },
      "description": "Platform entity ID of the content"
    },
    {
      "name": "progress",
      "required": false,
      "schema": { "type": "number", "format": "double" }
    },
    {
      "name": "completed",
      "required": false,
      "schema": { "type": "boolean" }
    },
    {
      "name": "watchedOn",
      "required": false,
      "schema": { "type": "string", "format": "date-time" }
    },
    {
      "name": "agePolicy",
      "required": false,
      "schema": { "$ref": "#/components/schemas/AgePolicy" }
    }
  ],
  "result": {
    "name": "result",
    "schema": { "type": "null" }
  },
  "examples": [...]
}
```

### 6. `events:` → Subscribe Method

Method name: `<Module>.<eventName>` (the name as declared, including `on` prefix)

**Critical rule:** Inject the `listen` parameter automatically. It must NOT appear
in the spec — it is a transport-layer detail, not an API semantic.

```json
{
  "name": "Lifecycle2.onStateChanged",
  "summary": "Subscribe to lifecycle state change notifications.",
  "tags": [{ "name": "subscribe" }],
  "params": [
    {
      "name": "listen",
      "required": true,
      "schema": { "type": "boolean" },
      "description": "Pass true to subscribe, false to unsubscribe"
    }
  ],
  "result": {
    "name": "result",
    "schema": {
      "oneOf": [
        { "$ref": "shared.json#/components/schemas/ListenResponse" },
        { "$ref": "#/components/schemas/StateChangedEvent" }
      ]
    }
  },
  "examples": [
    {
      "name": "becomeActive",
      "params": [{ "name": "listen", "value": true }],
      "result": {
        "name": "result",
        "value": { "oldState": "paused", "newState": "active" }
      }
    }
  ]
}
```

**The `result.schema.oneOf` rule for all subscribe methods:**
- First variant: `shared.json#/components/schemas/ListenResponse` — the subscribe confirmation
- Second variant: the payload type — what subscribers actually receive in push notifications

---

## Error Handling in OpenRPC

Firebolt 9 defines the following error taxonomy. Every method implicitly can return
these errors; they do not need to be re-declared on each method.

| Code | Class    | Name                | Description                                             |
|------|----------|---------------------|---------------------------------------------------------|
| 1    | Generic  | Unknown method      | Method not known to this version of Firebolt            |
| 2    | Generic  | Method not permitted| App does not have permission to call this method        |
| 3    | Generic  | Generic failure     | Unclassified failure                                    |
| 4    | Generic  | System failure      | Memory allocation or transport failure                  |
| 5    | Specific | Not implemented     | Non-mandatory method not available on this device       |

Error code 6 ("App state invalid") is not yet approved and must not appear in specs.

Methods that have known specific error conditions should document them in `description`.
Example: `Device.timeInActiveState` errors with code 6 if the app is not in an active state.

---

## The `listen` Param — Transport Layer Contract

The subscribe pattern in Firebolt 9 works over JSON-RPC 2.0 as follows:

```
Client → { "jsonrpc":"2.0", "method":"Lifecycle2.onStateChanged",
            "params":{"listen":true}, "id":1 }

Server → { "jsonrpc":"2.0", "result":{"listening":true,
            "event":"Lifecycle2.onStateChanged"}, "id":1 }

Server → { "jsonrpc":"2.0", "method":"Lifecycle2.onStateChanged",
            "params":{"oldState":"paused","newState":"active"} }
           ↑ no "id" field — this is a JSON-RPC 2.0 notification
```

Rules:
- The synchronous response (with matching `id`) carries a `ListenResponse`.
- Push notifications (no `id`) carry the event payload directly.
- Generators hide `listen` entirely and expose a callback + unsubscribe pattern.
- The AST does not carry the `listen` param — it is an OpenRPC/transport concern.

---

## Enum Identifier Derivation

Enum `id` values that are not valid programming-language identifiers must be
converted to safe names. This derivation is applied at the AST builder layer
and referenced in generated code. OpenRPC always uses the original wire value.

**Derivation algorithm:**
1. Split on non-alphanumeric characters (`:`, `.`, `-`, `_`, space)
2. PascalCase each segment
3. Join segments
4. If the result starts with a digit, prefix with the parent enum name

| Wire value            | Derived identifier   |
|-----------------------|----------------------|
| `"app:adult"`         | `AppAdult`           |
| `"app:child"`         | `AppChild`           |
| `"dolbyDigital5.1"`   | `DolbyDigital51`     |
| `"dolbyAtmos"`        | `DolbyAtmos`         |
| `"stereo"`            | `Stereo`             |
| `"5.1"` (hypothetical)| `AudioProfile51`     |

Both the wire value and the derived identifier are stored on the AST `EnumValue` node
so that generators can use the identifier without re-deriving it.

---

## Examples in OpenRPC

Every method derived from a spec that has `examples:` must include an OpenRPC
`examples` array. Each example maps spec `params:` and `result:` / `payload:`
values to an OpenRPC `examplePairingObject`.

For subscribe methods, examples use `listen: true` as the param and the payload
object as the result value (the notification form, not the ListenResponse form).

---

## OpenRPC Document Structure

Every derived OpenRPC file must include these top-level fields:

```json
{
  "openrpc": "1.2.4",
  "info": {
    "title": "<Module>",
    "version": "<spec version>",
    "description": "<module description first paragraph>"
  },
  "methods": [...],
  "components": {
    "schemas": { ... }
  }
}
```
