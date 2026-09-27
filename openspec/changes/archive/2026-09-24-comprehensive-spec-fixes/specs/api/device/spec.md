## MODIFIED Requirements

### Requirement: DeviceClass enum descriptions
The system SHALL provide detailed descriptions for each DeviceClass enum value.

#### Scenario: OTT device class description
- **WHEN** device class is ott
- **THEN** the description SHALL state "No tuner/demod, no integrated display"

#### Scenario: STB device class description
- **WHEN** device class is stb
- **THEN** the description SHALL state "With tuner/demod, no integrated display"

#### Scenario: TV device class description
- **WHEN** device class is tv
- **THEN** the description SHALL state "Possibly tuner/demod, with integrated display"