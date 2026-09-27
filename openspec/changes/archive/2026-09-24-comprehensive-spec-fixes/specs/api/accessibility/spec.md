## MODIFIED Requirements

### Requirement: ClosedCaptionsSettings preferredLanguages type
The system SHALL define preferredLanguages as a list of strings with specific constraints.

#### Scenario: Empty list when not initialized
- **WHEN** closed captions settings have not been initialized
- **THEN** preferredLanguages SHALL be an empty array []

#### Scenario: List of ISO 639-2/B language codes
- **WHEN** user has set language preferences
- **THEN** preferredLanguages SHALL contain one or more ISO 639-2/B language codes in order of decreasing preference

### Requirement: ClosedCaptionsSettings description
The system SHALL provide an accurate description for the closedCaptionsSettings property.

#### Scenario: Description includes enabled status and language list
- **WHEN** querying the closedCaptionsSettings property
- **THEN** the description SHALL state "Returns captions settings: enabled, and a list of zero or more languages in order of decreasing preference"