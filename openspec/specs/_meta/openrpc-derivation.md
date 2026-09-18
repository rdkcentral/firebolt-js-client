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
When using array syntax, extract the type name from the explicit `name:` field in each array item.

**`kind: enum`**

**Spec (array syntax):**
```yaml
types:
  - name: AudioProfile
    kind: enum
    description: |
      An audio encoding profile supported by the device hardware.
    values:
      - id: "stereo"
        description: Standard 2-channel PCM stereo
      - id: "dolbyDigital5.1"
        description: Dolby Digital 5.1 surround
      - id: "dolbyAtmos"
        description: Object-based Dolby Atmos
```

**Derived OpenRPC:**
```json
"AudioProfile": {
  "title": "AudioProfile",
  "type": "string",
  "enum": ["stereo", "dolbyDigital5.1", "dolbyAtmos"],
  "description": "An audio encoding profile supported by the device hardware."
}
```

**`kind: object`**

**Spec (array syntax):**
```yaml
types:
  - name: StateChangedEvent
    kind: object
    description: |
      Payload for a lifecycle state transition notification.
    properties:
      - name: oldState
        type:
          $ref: LifecycleState
        required: true
        description: The state the app transitioned from
      - name: newState
        type:
          $ref: LifecycleState
        required: true
        description: The state the app transitioned to
```

**Derived OpenRPC:**
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
When using array syntax, extract the property name from the explicit `name:` field in each array item.

#### Getter (always generated)

Method name: `<Module>.<propertyName>`

**Spec (array syntax):**
```yaml
properties:
  - name: audioDescription
    description: |
      Whether audio description is enabled on this device.
      This is a platform-level accessibility setting.
    type: bool
    writable: false
    since: "8.0.0"
```

**Derived OpenRPC:**
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
When using array syntax, extract the action name from the explicit `name:` field in each array item.

Params are mapped from the spec `params:` array in order. Each param becomes
a content descriptor with `required` set appropriately.

**Spec (array syntax):**
```yaml
actions:
  - name: watched
    description: |
      Notify the platform that content has been partially or completely watched.
      watchedOn must be ISO 8601 UTC: "YYYY-MM-DDThh:mm:ss.sssZ"
      agePolicy is set by the app to classify the content being reported.
    since: "8.0.0"
    params:
      - name: entityId
        type: string
        required: true
        description: Platform entity ID of the content
      - name: progress
        type: double
        required: false
        description: Playback progress from 0.0 (start) to 1.0 (end)
      - name: completed
        type: bool
        required: false
        description: True if the content was watched to completion
      - name: watchedOn
        type: string
        format: date-time
        required: false
        description: ISO 8601 UTC timestamp of when the content was watched
      - name: agePolicy
        type:
          $ref: AgePolicy
        required: false
        description: Age policy the app applies to this content
    result: none
```

**Derived OpenRPC:**
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
When using array syntax, extract the event name from the explicit `name:` field in each array item.

**Critical rule:** Inject the `listen` parameter automatically. It must NOT appear
in the spec — it is a transport-layer detail, not an API semantic.

**Spec (array syntax):**
```yaml
events:
  - name: onStateChanged
    description: |
      Notifies the app of a lifecycle state transition.
      The app/runtime remains in initializing until this subscribe call is made.
      Each notification carries exactly one transition.

      Valid transitions:
        initializing → paused | suspended
        paused → active | suspended
        active → paused
        suspended → paused | hibernated
        hibernated → suspended
        any → terminating
    since: "8.0.0"
    payload:
      type:
        $ref: StateChangedEvent
```

**Derived OpenRPC:**
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

### 7. Method-Level Platform Classification

When a spec declares a `platform` field on an action, property, or event, this is
derived as an OpenRPC extension field on the method. The extension field is
`x-firebolt-platform` and carries the platform value (`web`, `native`, or `both`).

**Spec (action with platform override):**
```yaml
actions:
  - name: uptime
    description: Returns the number of seconds since most recent device boot
    since: "9.0.0"
    platform: native
    params: []
    result:
      type: number
```

**Derived OpenRPC:**
```json
{
  "name": "Device.uptime",
  "summary": "Returns the number of seconds since most recent device boot",
  "params": [],
  "result": {
    "name": "result",
    "schema": { "type": "number" }
  },
  "x-firebolt-platform": "native"
}
```

**Spec (property with platform override):**
```yaml
properties:
  - name: timeZone
    description: Returns the IANA time zone format
    since: "9.0.0"
    platform: native
    result:
      type: string
```

**Derived OpenRPC (getter method):**
```json
{
  "name": "Localization.timeZone",
  "summary": "Returns the IANA time zone format",
  "params": [],
  "result": {
    "name": "result",
    "schema": { "type": "string" }
  },
  "x-firebolt-platform": "native"
}
```

**Derived OpenRPC (onChange subscription method):**
```json
{
  "name": "Localization.onTimeZoneChanged",
  "summary": "Subscribe to time zone setting change notifications",
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
        { "type": "string" }
      ]
    }
  },
  "x-firebolt-platform": "native"
}
```

**Spec (event with platform override):**
```yaml
events:
  - name: onTimeZoneChanged
    description: Event for when Localization.timeZone changed
    since: "9.0.0"
    platform: native
    params: []
    result:
      type: string
```

**Derived OpenRPC:**
```json
{
  "name": "Localization.onTimeZoneChanged",
  "summary": "Subscribe to time zone setting change notifications",
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
        { "type": "string" }
      ]
    }
  },
  "x-firebolt-platform": "native"
}
```

**Rules:**
- If a spec declares `platform` on an API element, emit `x-firebolt-platform` on the derived method
- If a spec does not declare `platform`, do not emit the extension (the method inherits from module-level `x-firebolt-platform` in the `info` object)
- The extension value must be one of: `web`, `native`, `both`
- For properties, both the getter and onChange subscription methods inherit the same platform classification
- The extension is placed at the method level, not within `params` or `result`

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
