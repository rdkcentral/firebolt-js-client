## MODIFIED Requirements

### Requirement: watched action agePolicy parameter
The watched action SHALL accept an agePolicy parameter that references the shared AgePolicy type for content classification.

#### Scenario: Watched with shared AgePolicy
- **WHEN** the app calls `Discovery.watched({ entityId: "entity-12345", agePolicy: "app:adult" })`
- **THEN** the platform SHALL use the shared AgePolicy type for validation
- **AND** the platform SHALL classify the content according to the age policy

## REMOVED Requirements

### Requirement: Local AgePolicy type definition
**Reason**: AgePolicy moved to shared module for cross-module reuse
**Migration**: Update references to use shared AgePolicy type instead of local definition
