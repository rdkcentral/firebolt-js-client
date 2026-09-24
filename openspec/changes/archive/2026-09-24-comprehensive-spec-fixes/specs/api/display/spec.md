## MODIFIED Requirements

### Requirement: Display.colorimetry return type
The system SHALL define colorimetry as an unordered list of enum values.

#### Scenario: Colorimetry returns unordered list
- **WHEN** querying Display.colorimetry
- **THEN** the result SHALL be an unordered list of colorimetry enum values

#### Scenario: Colorimetry enum values
- **WHEN** colorimetry is supported
- **THEN** the list SHALL contain values from the set: bt709, bt2020

#### Scenario: Empty list when no TV attached
- **WHEN** no TV is attached to the device
- **THEN** colorimetry SHALL return an empty list

### Requirement: Display.colorimetry description
The system SHALL provide an accurate description for the colorimetry method.

#### Scenario: Description includes unordered list and empty list behavior
- **WHEN** querying the colorimetry method description
- **THEN** it SHALL state "Returns an unordered list of colorimetry values supported by the attached TV or integral display. Returns an empty list if no TV is attached"

### Requirement: Display.videoResolutions return type
The system SHALL define videoResolutions as an unordered list of enum values.

#### Scenario: VideoResolutions returns unordered list
- **WHEN** querying Display.videoResolutions
- **THEN** the result SHALL be an unordered list of video resolution enum values

#### Scenario: VideoResolutions enum values
- **WHEN** video resolutions are supported
- **THEN** the list SHALL contain values from the set: 720p50, 720p60, 1080p50, 1080p60, 2160p50, 2160p60

#### Scenario: Empty list when no TV attached
- **WHEN** no TV is attached to the device
- **THEN** videoResolutions SHALL return an empty list

### Requirement: Display.videoResolutions description
The system SHALL provide an accurate description for the videoResolutions method.

#### Scenario: Description includes unordered list and empty list behavior
- **WHEN** querying the videoResolutions method description
- **THEN** it SHALL state "Returns an unordered list of HD video resolutions and frame rates supported by the attached TV or integral display. Returns an empty list if no TV is attached"