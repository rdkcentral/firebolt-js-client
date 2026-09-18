## ADDED Requirements

### Requirement: AgePolicy shared type
The shared module SHALL provide an AgePolicy type for cross-module age classification of content.

#### Scenario: AgePolicy for adult content
- **WHEN** age policy is set to "app:adult"
- **THEN** the content SHALL be classified as adult content

#### Scenario: AgePolicy for child content
- **WHEN** age policy is set to "app:child"
- **THEN** the content SHALL be classified as child content

#### Scenario: AgePolicy for teen content
- **WHEN** age policy is set to "app:teen"
- **THEN** the content SHALL be classified as teen content
