## MODIFIED Requirements

### Requirement: MediaLoadStartParams entityId type
The system SHALL define entityId as a string type in MediaLoadStartParams.

#### Scenario: MediaLoadStartParams entityId is string
- **WHEN** calling mediaLoadStart with params
- **THEN** the entityId field SHALL be of type string

### Requirement: MediaLoadStartParams agePolicy type
The system SHALL define agePolicy as an optional string type in MediaLoadStartParams.

#### Scenario: MediaLoadStartParams agePolicy is optional string
- **WHEN** calling mediaLoadStart with params
- **THEN** the agePolicy field SHALL be of type string and required: false

### Requirement: MediaPlayParams entityId type
The system SHALL define entityId as a string type in MediaPlayParams.

#### Scenario: MediaPlayParams entityId is string
- **WHEN** calling mediaPlay with params
- **THEN** the entityId field SHALL be of type string

### Requirement: MediaPlayParams agePolicy type
The system SHALL define agePolicy as an optional string type in MediaPlayParams.

#### Scenario: MediaPlayParams agePolicy is optional string
- **WHEN** calling mediaPlay with params
- **THEN** the agePolicy field SHALL be of type string and required: false

### Requirement: MediaPlayingParams entityId type
The system SHALL define entityId as a string type in MediaPlayingParams.

#### Scenario: MediaPlayingParams entityId is string
- **WHEN** calling mediaPlaying with params
- **THEN** the entityId field SHALL be of type string

### Requirement: MediaPlayingParams agePolicy type
The system SHALL define agePolicy as an optional string type in MediaPlayingParams.

#### Scenario: MediaPlayingParams agePolicy is optional string
- **WHEN** calling mediaPlaying with params
- **THEN** the agePolicy field SHALL be of type string and required: false

### Requirement: MediaPauseParams entityId type
The system SHALL define entityId as a string type in MediaPauseParams.

#### Scenario: MediaPauseParams entityId is string
- **WHEN** calling mediaPause with params
- **THEN** the entityId field SHALL be of type string

### Requirement: MediaPauseParams agePolicy type
The system SHALL define agePolicy as an optional string type in MediaPauseParams.

#### Scenario: MediaPauseParams agePolicy is optional string
- **WHEN** calling mediaPause with params
- **THEN** the agePolicy field SHALL be of type string and required: false

### Requirement: MediaWaitingParams entityId type
The system SHALL define entityId as a string type in MediaWaitingParams.

#### Scenario: MediaWaitingParams entityId is string
- **WHEN** calling mediaWaiting with params
- **THEN** the entityId field SHALL be of type string

### Requirement: MediaWaitingParams agePolicy type
The system SHALL define agePolicy as an optional string type in MediaWaitingParams.

#### Scenario: MediaWaitingParams agePolicy is optional string
- **WHEN** calling mediaWaiting with params
- **THEN** the agePolicy field SHALL be of type string and required: false

### Requirement: MediaEndedParams entityId type
The system SHALL define entityId as a string type in MediaEndedParams.

#### Scenario: MediaEndedParams entityId is string
- **WHEN** calling mediaEnded with params
- **THEN** the entityId field SHALL be of type string

### Requirement: MediaEndedParams agePolicy type
The system SHALL define agePolicy as an optional string type in MediaEndedParams.

#### Scenario: MediaEndedParams agePolicy is optional string
- **WHEN** calling mediaEnded with params
- **THEN** the agePolicy field SHALL be of type string and required: false