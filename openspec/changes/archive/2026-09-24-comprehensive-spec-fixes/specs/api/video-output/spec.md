## MODIFIED Requirements

### Requirement: VideoResolution width and height types
The system SHALL define width and height as unsigned types with specific allowed value combinations.

#### Scenario: Allowed resolution combinations
- **WHEN** defining VideoResolution
- **THEN** width and height SHALL be unsigned types with allowed combinations: (720, 480), (720, 576), (1280, 720), (1920, 1080), (3840, 2160)

### Requirement: VideoOutput.resolution description
The system SHALL provide an accurate description for the resolution property.

#### Scenario: Description includes pixel dimensions and device type behavior
- **WHEN** querying the resolution property description
- **THEN** it SHALL state "Returns the width and height of the video signal on the video output, in pixels. Typically used by a streaming app to determine the highest resolution of video to select. OTT/STB device: returns the video resolution over HDMI. TV device: returns the resolution of the panel"

### Requirement: VideoOutput.hdcp description
The system SHALL provide an accurate description for the hdcp property with device type behavior.

#### Scenario: Description includes OTT/STB and TV device behavior
- **WHEN** querying the hdcp property description
- **THEN** it SHALL state "Returns the current state of output protection on the video output. OTT/STB device: returns the negotiated HDCP version on the video output, or none if an encrypted connection has not been made between the OTT/STB device and any attached TV. TV device: returns direct"

### Requirement: VideoOutput.onHdcpChanged description
The system SHALL provide an accurate description for the onHdcpChanged event with device type behavior.

#### Scenario: Description includes OTT/STB and TV device behavior
- **WHEN** querying the onHdcpChanged event description
- **THEN** it SHALL state "Event for when VideoOutput.hdcp changed. Returns the current state of output protection on the video output. OTT/STB device: returns the negotiated HDCP version on the video output, or none if an encrypted connection has not been made between the OTT/STB device and any attached TV. TV device: returns direct"