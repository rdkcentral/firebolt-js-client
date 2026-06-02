## ADDED Requirements

### Requirement: Advertising module exposes advertising identifier
The Advertising module spec SHALL be created with `platform: both` and SHALL declare an `actions` entry named `advertisingId` that takes no parameters and returns `AdvertisingId` (an object with `ifa: string`, `ifa_type: string` enum, and `lmt: string` enum). Introduced in API version 8.0.0.

`ifa_type` SHALL be one of: `"dpid"` (device-provided), `"sspid"` (SSP-provided), `"sessionid"` (session/synthetic).
`lmt` SHALL be one of: `"0"` (limit ad tracking disabled), `"1"` (limit ad tracking enabled).

#### Scenario: Advertising.advertisingId is in the method registry
- **WHEN** the inject-js bundle is generated from the Advertising OpenRPC
- **THEN** `_methodRegistry["Advertising.advertisingId"]` MUST exist with `kind: "call"`
- **THEN** `_typeSchemas["Advertising.AdvertisingId"]` MUST be an object schema with `ifa`, `ifa_type`, and `lmt` fields

#### Scenario: ifa_type enum values are correct
- **WHEN** `_typeSchemas["Advertising.IfaType"]` is inspected (or inline enum in `AdvertisingId`)
- **THEN** the enum values MUST include exactly `"dpid"`, `"sspid"`, and `"sessionid"`

#### Scenario: lmt enum values are correct
- **WHEN** the `lmt` field schema is inspected
- **THEN** the enum values MUST include exactly `"0"` and `"1"`
