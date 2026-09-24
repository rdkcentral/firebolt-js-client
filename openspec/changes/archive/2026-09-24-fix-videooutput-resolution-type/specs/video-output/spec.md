## MODIFIED Requirements

### Requirement: VideoOutput module exposes resolution getter
The VideoOutput module SHALL declare `resolution` as a `properties` entry with result type `VideoResolution` (an object with `width: unsigned` and `height: unsigned`). Valid values are: 720×480, 720×576, 1280×720, 1920×1080, 3840×2160. Introduced in API version 8.0.0.

#### Scenario: Device output resolution is 4K
- **WHEN** the app calls `VideoOutput.resolution()`
- **THEN** the platform SHALL return `{ width: 3840, height: 2160 }`

### Requirement: VideoResolution type definition
The VideoResolution type SHALL be an object with `width: unsigned` and `height: unsigned` properties representing the current video resolution.

#### Scenario: VideoResolution type is properly defined
- **WHEN** the VideoResolution type is referenced
- **THEN** it SHALL be an object with `width` and `height` as unsigned fields
- **THEN** common values include 720×480, 720×576, 1280×720, 1920×1080, 3840×2160

## ADDED Requirements

### Requirement: VideoOutput module exposes resolution event
The VideoOutput module SHALL declare `onResolutionChanged` as an `events` entry with result type `VideoResolution` (an object with `width: unsigned` and `height: unsigned`). Introduced in API version 8.0.0.

#### Scenario: Resolution changed to 1080p
- **WHEN** the video output resolution changes to 1920×1080
- **THEN** the platform SHALL fire the onResolutionChanged event with `{ width: 1920, height: 1080 }`
