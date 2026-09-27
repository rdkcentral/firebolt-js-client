## MODIFIED Requirements

### Requirement: Actions.start intent parameter type
The system SHALL define the intent parameter as a JSON object type, not a string.

#### Scenario: Intent parameter is object type
- **WHEN** calling Actions.start with an intent parameter
- **THEN** the intent parameter SHALL be of type object representing a JSON document

### Requirement: Actions.intent property type
The system SHALL define the intent property result as a JSON object type, not a string.

#### Scenario: Intent property returns object
- **WHEN** querying the Actions.intent property
- **THEN** the result SHALL be of type object representing a JSON document

### Requirement: IntentPayload intent field type
The system SHALL define the intent field in IntentPayload as a JSON object type, not a string.

#### Scenario: IntentPayload contains object
- **WHEN** receiving an IntentPayload
- **THEN** the intent field SHALL be of type object representing a JSON document