## MODIFIED Requirements

### Requirement: Discovery.watched progress parameter type
The system SHALL define the progress parameter with conditional types based on content type.

#### Scenario: VOD content progress range
- **WHEN** reporting progress for VOD (video on demand) content
- **THEN** progress SHALL be a number from 0 to 0.99

#### Scenario: Live content progress in seconds
- **WHEN** reporting progress for live content
- **THEN** progress SHALL be a number representing seconds watched

### Requirement: Discovery.watched watchedOn parameter format
The system SHALL define the watchedOn parameter with ISO 8601 datetime format.

#### Scenario: watchedOn uses ISO 8601 format
- **WHEN** providing the watchedOn timestamp
- **THEN** the format SHALL be "YYYY-MM-DDThh:mm:ss.sssZ"

### Requirement: Discovery.watched agePolicy parameter values
The system SHALL define the agePolicy parameter with specific string enum values.

#### Scenario: Valid agePolicy values
- **WHEN** specifying the agePolicy parameter
- **THEN** the value SHALL be one of "app:adult", "app:child", or "app:teen"