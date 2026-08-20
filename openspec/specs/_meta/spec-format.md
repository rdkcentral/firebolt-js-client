# OpenSpec Format — Authoring Guide

> **Meta-guideline.** All module spec files under `openspec/specs/<module>/spec.md`
> must conform to this format. This document is the source of truth for spec authoring.

---

## File Layout

Each module spec is a single Markdown file with a YAML frontmatter block.
All structured API definitions live inside the frontmatter.
Extended prose goes in YAML multiline string fields (use `|`).

```
openspec/specs/<module>/spec.md
```

---

## Top-Level Fields

```yaml
---
module:      <ModuleName>    # required — PascalCase, e.g. Device, Lifecycle2
version:     "<semver>"      # required — Firebolt API version, e.g. "9.0"
platform:    <platform>      # required — see Platform Classification below
stability:   <stability>     # required — see Stability Levels below
description: |               # required — multiline prose describing the module purpose
  ...

types:       {}              # optional — type declarations local to this module
properties:  {}              # optional — readable (and optionally writable) platform values
actions:     {}              # optional — imperative calls with no event counterpart
events:      {}              # optional — spontaneous events with no getter counterpart
---
```

---

## Platform Classification

Every spec MUST declare `platform`. This field drives which language headers are
generated. Omitting it is a build error.

| Value    | Generators that run           | Use when…                                      |
|----------|-------------------------------|------------------------------------------------|
| `web`    | ts · res · kt                 | API is only available to web-based app runtimes |
| `native` | cpp · py                      | API is only available to native SDK integrations |
| `both`   | ts · res · kt · cpp · py      | API is available to all runtimes               |

**Examples:**
- `Lifecycle2` — native app lifecycle hooks, not exposed over the web runtime → `platform: native`
- `Discovery` — content-reporting signals used by both web apps and native integrations → `platform: both`
- A hypothetical DOM-only capability → `platform: web`

The `x-firebolt-platform` extension field on the OpenRPC `info` object is derived
directly from this spec field. Never set them to different values.

---

## Primitive Types

Use these names directly in `type:` fields. They are Firebolt 9 primitives.

| Spec type  | JSON Schema mapping                           | Notes                  |
|------------|-----------------------------------------------|------------------------|
| `bool`     | `{ "type": "boolean" }`                       |                        |
| `string`   | `{ "type": "string" }`                        |                        |
| `unsigned` | `{ "type": "integer", "minimum": 0 }`         | 64-bit unsigned int    |
| `double`   | `{ "type": "number", "format": "double" }`    | 64-bit IEEE 754        |

### Format Annotations

Append `format:` to a `string` type when the value follows a recognised standard:

```yaml
type: string
format: date-time    # ISO 8601 UTC: "YYYY-MM-DDThh:mm:ss.sssZ"
```

Generators map `format: date-time` to the language-idiomatic datetime type.
See `generator-conventions.md` for the per-language mapping.

### String Constraints

When a `string` value has a well-defined shape that can be validated, declare the
constraints alongside the type. All three fields are optional and combinable.

```yaml
type: string
minLength: <unsigned>   # minimum number of characters (inclusive)
maxLength: <unsigned>   # maximum number of characters (inclusive)
pattern:   "<regex>"    # ECMAScript regular expression the value must fully match
```

**Well-known string constraint patterns:**

| Value domain               | minLength | maxLength | pattern                     |
|----------------------------|-----------|-----------|-----------------------------|
| ISO 3166-1 alpha-2 country | 2         | 2         | `^[A-Z]{2}$`                |
| ISO 3166-1 alpha-3 country | 3         | 3         | `^[A-Z]{3}$`                |
| ISO 639-1 language code    | 2         | 2         | `^[a-z]{2}$`                |
| BCP 47 locale tag          | 2         | 35        | `^[a-zA-Z][a-zA-Z0-9\-]*$` |

---

### Numeric Constraints

When a `double` or `unsigned` value has a defined valid range, declare the bounds
alongside the type. Both fields are optional.

```yaml
type: double            # or unsigned
minimum: <number>       # inclusive lower bound
maximum: <number>       # inclusive upper bound
```

**Rules:**

1. **Constraints are enforced at spec authoring time.** When a numeric type has a
   known valid range it MUST be declared. Leaving bounds undeclared when they are
   known is a spec defect.

2. **`minimum` and `maximum` are inclusive** and correspond directly to the JSON
   Schema `minimum` / `maximum` keywords.

3. **Constraints are carried into the AST** on every `PrimitiveRef` node that
   resolves to a constrained numeric, making them available to all generators.

4. **Generators use constraints as documentation at minimum.** They may also emit
   type-system annotations where the target language supports them (e.g. Python's
   `Annotated[float, ...]`).

**Well-known numeric constraint examples:**

| Value domain                        | minimum | maximum |
|-------------------------------------|---------|---------|
| Voice guidance rate (1.0 = normal)  | 0.1     | 10      |
| Percentage                          | 0       | 100     |
| Volume (0 = silent)                 | 0.0     | 1.0     |

**Example — voice guidance rate:**

```yaml
actions:
  voiceGuidanceSettings:
    result:
      type: object
      properties:
        rate:
          type: double
          minimum: 0.1
          maximum: 10
          description: Speech rate relative to normal; 1.0 = normal speed
```

**Rules (string and numeric constraints, shared):**

1. **Constraints are enforced at spec authoring time.** When a type has known
   constraints they MUST be declared.

2. **Constraints are carried into the AST** and are available to all generators.

3. **Generators document constraints at minimum;** type-safe annotations are
   emitted where the target language supports them.

---

## TypeRef Syntax

A TypeRef appears wherever a type is required: property type, param type,
result type, or object field type.

```yaml
# Primitive shorthand
type: string
type: bool
type: unsigned
type: double

# Primitive with format annotation
type: string
format: date-time

# Named reference — must resolve to a type in this module's types: section
# or the shared module (prefix with "shared:")
type:
  $ref: AudioProfile

type:
  $ref: "shared:ListenResponse"

# Array of a named type
type: array
items:
  $ref: AudioProfile

# Array of a primitive
type: array
items: string

# Optionality is expressed at the field level, not the type level
required: false           # the field or param is optional; its type is unchanged
```

---

## `types:` — Type Declarations

Local type declarations for this module. Types defined here can be referenced
by `$ref` from any property, action, event, or object field within the same spec.

### `kind: enum`

```yaml
types:
  AudioProfile:
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

**Rules:**
- `id` is the **wire value** — the exact string that appears in JSON on the wire.
- `id` values that are not valid programming-language identifiers (contain `:`, `.`,
  `-`, or start with a digit) are automatically mapped to safe identifiers by the
  AST builder. Authors do not need to supply the safe name (see `canonical-ast.md`).
- Member order is significant and preserved in generated code.
- Every member should have a `description`.

### `kind: object`

```yaml
types:
  StateChangedEvent:
    kind: object
    description: |
      Payload for a lifecycle state transition notification.
    properties:
      oldState:
        type:
          $ref: LifecycleState
        required: true
        description: The state the app transitioned from
      newState:
        type:
          $ref: LifecycleState
        required: true
        description: The state the app transitioned to
```

**Rules:**
- Object property names are camelCase.
- Every property must declare `required: true` or `required: false`.
- Every property must have a `description`.

---

## `properties:` — Observable Platform Values

A property is a platform-maintained value that apps can read and observe.
Every property automatically generates:
- A **getter** method (`<propertyName>`)
- An **onChange event** (`on<PropertyName>Changed`)
- Optionally a **setter** method (`set<PropertyName>`) if `writable: true`

```yaml
properties:
  audioDescription:
    description: |
      Whether audio description is enabled on this device.
      This is a platform-level accessibility setting.
    type: bool
    writable: false
    since: "8.0.0"
    examples:
      - description: Audio description is enabled
        value: true
      - description: Audio description is disabled
        value: false
```

**Rules:**
- `type` is a TypeRef.
- `writable: false` (default) — generates getter + onChange event only.
- `writable: true` — generates getter + setter + onChange event.
- The event payload type is **always identical** to the property type. There is no
  separate event payload type for properties.
- `since` records the Firebolt API version when this property was introduced.
- `examples` are optional but strongly encouraged — they flow into OpenRPC and
  are used for contract validation and consumer documentation.

---

## `actions:` — Imperative Calls

An action is a call that may have parameters and a return value.
Actions do **not** generate an event counterpart.

```yaml
actions:
  watched:
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
    examples:
      - description: Report a partial watch with age policy
        params:
          entityId: "entity-12345"
          progress: 0.75
          agePolicy: "app:adult"
        result: null
```

**Rules:**
- `params` is optional. Omit entirely or use `[]` for zero-parameter actions.
- Required params (`required: true`) must appear before optional params (`required: false`).
- `result: none` — the call returns nothing (void/Unit/null across languages).
- `result:` with a TypeRef — the call returns that type.
- Every param must have `name`, `type`, `required`, and `description`.

---

## `events:` — Standalone Subscriptions

A standalone event fires spontaneously from the platform and has no getter.
This section is only for events that are **not** tied to a property.
(Property onChange events are auto-generated — do not declare them here.)

```yaml
events:
  onStateChanged:
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
    examples:
      - description: App becomes active from paused
        payload:
          oldState: paused
          newState: active
```

**Rules:**
- Event names must begin with `on`.
- `payload.type` is a TypeRef — this is what subscribers receive in their callback.
- Do **not** declare a `listen: boolean` param. It is injected automatically at the
  OpenRPC derivation layer (see `openrpc-derivation.md`).
- Use a named `$ref` type for the payload rather than an inline object definition.

---

## Stability Levels

| Value          | Meaning                                                          |
|----------------|------------------------------------------------------------------|
| `stable`       | Approved and ready for implementation                            |
| `beta`         | Functionally defined but subject to minor change                 |
| `experimental` | Exploratory; API surface may change significantly                |
| `deprecated`   | Retained for compatibility; do not use in new implementations    |

---

## Cross-Module Type References

Cross-module type references are not currently needed in Firebolt 9.
All referenced types must be defined in the same module's `types:` section,
or in the shared module at `openspec/specs/shared/spec.md`.

To reference a shared type, prefix with `"shared:"`:

```yaml
type:
  $ref: "shared:ListenResponse"
```

---

## Naming Conventions Quick Reference

| Element      | Convention                    | Example                        |
|--------------|-------------------------------|--------------------------------|
| Module       | PascalCase                    | `Device`, `Lifecycle2`         |
| Type         | PascalCase                    | `AudioProfile`, `StateChangedEvent` |
| Property     | camelCase                     | `audioDescription`             |
| Action       | camelCase                     | `watched`, `start`             |
| Event        | camelCase, `on` prefix        | `onStateChanged`               |
| Param        | camelCase                     | `entityId`, `handlerAppId`     |
| Object field | camelCase                     | `oldState`, `newState`         |
| Enum value   | wire string (exact as sent)   | `"app:adult"`, `"dolbyDigital5.1"` |
