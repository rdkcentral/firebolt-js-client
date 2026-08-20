## ADDED Requirements

### Requirement: Metrics module exposes app lifecycle readiness signal
The Metrics module spec SHALL be created with `platform: both`. It SHALL declare `ready` as an `actions` entry that takes no parameters and returns `null`. Introduced in API version 8.0.0.

#### Scenario: Metrics.ready is in the method registry
- **WHEN** the inject-js bundle is generated from the Metrics OpenRPC
- **THEN** `_methodRegistry["Metrics.ready"]` MUST exist with `kind: "call"`

---

### Requirement: Metrics module exposes content lifecycle signals
The Metrics module spec SHALL declare `startContent` and `stopContent` as `actions` entries, each accepting `entityId` (string, optional) and `agePolicy` (string referencing `Shared.AgePolicy`, optional) and returning `null`. Introduced in API version 8.0.0.

#### Scenario: Metrics.startContent is in the method registry
- **WHEN** the inject-js bundle is generated
- **THEN** `_methodRegistry["Metrics.startContent"]` MUST exist with `kind: "call"`

#### Scenario: Metrics.stopContent is in the method registry
- **WHEN** the inject-js bundle is generated
- **THEN** `_methodRegistry["Metrics.stopContent"]` MUST exist with `kind: "call"`

---

### Requirement: Metrics module exposes page view signal
The Metrics module spec SHALL declare `page` as an `actions` entry accepting `pageId` (string, required) and `agePolicy` (optional) and returning `null`. Introduced in API version 8.0.0.

#### Scenario: Metrics.page is in the method registry
- **WHEN** the inject-js bundle is generated
- **THEN** `_methodRegistry["Metrics.page"]` MUST exist with `kind: "call"`

---

### Requirement: Metrics module exposes error reporting signal
The Metrics module spec SHALL declare `error` as an `actions` entry accepting `type` (ErrorType enum: `"network"`, `"media"`, `"restriction"`, `"entitlement"`, `"other"`), `code` (string), `description` (string), `visible` (bool), `parameters` (string, optional), and `agePolicy` (optional) and returning `null`. Introduced in API version 8.0.0.

#### Scenario: Metrics.error is in the method registry
- **WHEN** the inject-js bundle is generated
- **THEN** `_methodRegistry["Metrics.error"]` MUST exist with `kind: "call"`
- **THEN** `_typeSchemas["Metrics.ErrorType"]` MUST be an enum with values `["network","media","restriction","entitlement","other"]`

---

### Requirement: Metrics module exposes media playback telemetry signals
The Metrics module spec SHALL declare the following `actions` entries, each accepting `entityId` (string, required) and `agePolicy` (optional) and returning `null`:
- `mediaLoadStart` — called when media URL is set (infer load time)
- `mediaPlay` — called when playback should start
- `mediaPlaying` — called when playback actually starts or resumes
- `mediaPause` — called when playback intentionally pauses
- `mediaWaiting` — called when playback halts due to buffering/network
- `mediaEnded` — called when playback reaches end of media

Introduced in API version 8.0.0.

#### Scenario: All basic media lifecycle methods are in the method registry
- **WHEN** the inject-js bundle is generated
- **THEN** `_methodRegistry["Metrics.mediaLoadStart"]` MUST exist with `kind: "call"`
- **THEN** `_methodRegistry["Metrics.mediaPlay"]` MUST exist with `kind: "call"`
- **THEN** `_methodRegistry["Metrics.mediaPlaying"]` MUST exist with `kind: "call"`
- **THEN** `_methodRegistry["Metrics.mediaPause"]` MUST exist with `kind: "call"`
- **THEN** `_methodRegistry["Metrics.mediaWaiting"]` MUST exist with `kind: "call"`
- **THEN** `_methodRegistry["Metrics.mediaEnded"]` MUST exist with `kind: "call"`

---

### Requirement: Metrics module exposes media seek signals
The Metrics module spec SHALL declare `mediaSeeking` (accepts `entityId`, `target: double`, `agePolicy`) and `mediaSeeked` (accepts `entityId`, `position: double`, `agePolicy`), both returning `null`. Introduced in API version 8.0.0.

#### Scenario: mediaSeeking and mediaSeeked are in the method registry
- **WHEN** the inject-js bundle is generated
- **THEN** `_methodRegistry["Metrics.mediaSeeking"]` MUST exist with `kind: "call"`
- **THEN** `_methodRegistry["Metrics.mediaSeeked"]` MUST exist with `kind: "call"`

---

### Requirement: Metrics module exposes media rate change signal
The Metrics module spec SHALL declare `mediaRateChanged` accepting `entityId`, `rate: double`, and `agePolicy` (optional), returning `null`. Introduced in API version 8.0.0.

#### Scenario: Metrics.mediaRateChanged is in the method registry
- **WHEN** the inject-js bundle is generated
- **THEN** `_methodRegistry["Metrics.mediaRateChanged"]` MUST exist with `kind: "call"`

---

### Requirement: Metrics module exposes media rendition change signal
The Metrics module spec SHALL declare `mediaRenditionChanged` accepting `entityId`, `bitrate: unsigned`, `width: unsigned`, `height: unsigned`, `profile: string` (optional), and `agePolicy` (optional), returning `null`. Introduced in API version 8.0.0.

#### Scenario: Metrics.mediaRenditionChanged is in the method registry
- **WHEN** the inject-js bundle is generated
- **THEN** `_methodRegistry["Metrics.mediaRenditionChanged"]` MUST exist with `kind: "call"`

---

### Requirement: Metrics module exposes custom distributor metrics signal
The Metrics module spec SHALL declare `event` accepting `schema: string` (a URI), `data: string` (JSON document), and `agePolicy` (optional), returning `null`. Introduced in API version 8.0.0.

#### Scenario: Metrics.event is in the method registry
- **WHEN** the inject-js bundle is generated
- **THEN** `_methodRegistry["Metrics.event"]` MUST exist with `kind: "call"`

---

### Requirement: Metrics module exposes app build info signal
The Metrics module spec SHALL declare `appInfo` accepting `build: string` and returning `null`. Introduced in API version 8.0.0.

#### Scenario: Metrics.appInfo is in the method registry
- **WHEN** the inject-js bundle is generated
- **THEN** `_methodRegistry["Metrics.appInfo"]` MUST exist with `kind: "call"`
