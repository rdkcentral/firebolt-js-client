## ADDED Requirements

### Requirement: Network module exposes connectivity getter and event
The Network module spec SHALL be created with `platform: both` and SHALL declare `connected` as a `properties` entry with result type `bool`. The derived OpenRPC SHALL contain both `Network.connected` (call) and `Network.onConnectedChanged` (subscribe). Introduced in API version 8.0.0.

#### Scenario: Network.connected getter is in the method registry
- **WHEN** the inject-js bundle is generated from the Network OpenRPC
- **THEN** `_methodRegistry["Network.connected"]` MUST exist with `kind: "call"`
- **THEN** `resultSchema` MUST be primitive `bool`

#### Scenario: Network.onConnectedChanged subscription is in the method registry
- **WHEN** the inject-js bundle is generated
- **THEN** `_methodRegistry["Network.onConnectedChanged"]` MUST exist with `kind: "subscribe"`
- **THEN** `resultSchema` MUST be primitive `bool`
