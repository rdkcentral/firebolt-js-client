## ADDED Requirements

### Requirement: Actions module exposes platform intent dispatch
The Actions module spec SHALL be created with `platform: both` and SHALL declare an `actions` entry named `start` that accepts `intent` (string, required) and `handlerAppId` (string, optional) and returns `null`. Introduced in API version 9.0.0.

#### Scenario: Actions.start is in the method registry
- **WHEN** the inject-js bundle is generated from the Actions OpenRPC
- **THEN** `_methodRegistry["Actions.start"]` MUST exist with `kind: "call"`
- **THEN** the params schema MUST include `intent` as a required string
- **THEN** the params schema MUST include `handlerAppId` as an optional string

#### Scenario: Actions.start returns null
- **WHEN** `Actions.start` is called
- **THEN** the method MUST return no result value (null)

---

### Requirement: Actions module exposes last-received intent getter and event
The Actions module spec SHALL declare `intent` as a `properties` entry with result type `IntentPayload` (an object with `intentId: unsigned` and `intent: string`). The derived OpenRPC SHALL contain both `Actions.intent` (call) and `Actions.onIntent` (subscribe). Introduced in API version 9.0.0.

#### Scenario: Actions.intent getter is in method registry
- **WHEN** the inject-js bundle is generated
- **THEN** `_methodRegistry["Actions.intent"]` MUST exist with `kind: "call"`
- **THEN** `_typeSchemas["Actions.IntentPayload"]` MUST be an object with `intentId` (unsigned) and `intent` (string) fields

#### Scenario: Actions.onIntent subscription is in method registry
- **WHEN** the inject-js bundle is generated
- **THEN** `_methodRegistry["Actions.onIntent"]` MUST exist with `kind: "subscribe"`
- **THEN** `resultSchema` MUST be the same `IntentPayload` type as the getter
