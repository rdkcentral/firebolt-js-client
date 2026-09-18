## MODIFIED Requirements

### Requirement: startContent action
The startContent action SHALL signal that the app is starting to show video or audio content with entity identification and age policy context.

#### Scenario: Start content with entity and age policy
- **WHEN** the app calls `Metrics.startContent({ entityId: "video123", agePolicy: "app:adult" })`
- **THEN** the platform SHALL record the content start event
- **AND** the platform SHALL associate the event with the entity ID
- **AND** the platform SHALL apply the age policy for content classification

### Requirement: stopContent action
The stopContent action SHALL signal that the app has stopped showing video or audio content with entity identification and age policy context.

#### Scenario: Stop content with entity and age policy
- **WHEN** the app calls `Metrics.stopContent({ entityId: "video123", agePolicy: "app:adult" })`
- **THEN** the platform SHALL record the content stop event
- **AND** the platform SHALL associate the event with the entity ID
- **AND** the platform SHALL apply the age policy for content classification

### Requirement: page action
The page action SHALL signal that the app has transitioned to a new page with page identification and optional age policy context.

#### Scenario: Page transition with page ID
- **WHEN** the app calls `Metrics.page({ pageId: "details" })`
- **THEN** the platform SHALL record the page transition event
- **AND** the platform SHALL identify the destination page

#### Scenario: Page transition with age policy
- **WHEN** the app calls `Metrics.page({ pageId: "details", agePolicy: "app:child" })`
- **THEN** the platform SHALL record the page transition event
- **AND** the platform SHALL apply the age policy for content classification

### Requirement: error action
The error action SHALL log an error that occurred within the app with structured error information including type, code, description, visibility, optional parameters, and optional age policy.

#### Scenario: Log network error
- **WHEN** the app calls `Metrics.error({ type: "network", code: "DNS_FAILED", description: "DNS resolution failed", visible: true })`
- **THEN** the platform SHALL record the error event
- **AND** the platform SHALL classify the error as network type
- **AND** the platform SHALL store the error code and description
- **AND** the platform SHALL mark the error as visible to the user

#### Scenario: Log error with parameters
- **WHEN** the app calls `Metrics.error({ type: "media", code: "BUFFER_TIMEOUT", description: "Buffer timeout", visible: false, parameters: { retryCount: 3, duration: 5000 } })`
- **THEN** the platform SHALL record the error event
- **AND** the platform SHALL store the additional error parameters

#### Scenario: Log error with age policy
- **WHEN** the app calls `Metrics.error({ type: "entitlement", code: "NOT_SUBSCRIBED", description: "User not subscribed", visible: true, agePolicy: "app:adult" })`
- **THEN** the platform SHALL record the error event
- **AND** the platform SHALL apply the age policy for content context

### Requirement: mediaSeeking action
The mediaSeeking action SHALL signal that the user is seeking to a new playback position with entity identification, target position, and optional age policy.

#### Scenario: Media seeking with target
- **WHEN** the app calls `Metrics.mediaSeeking({ entityId: "video123", target: 120.5 })`
- **THEN** the platform SHALL record the seek start event
- **AND** the platform SHALL identify the target playback position

#### Scenario: Media seeking with age policy
- **WHEN** the app calls `Metrics.mediaSeeking({ entityId: "video123", target: 120.5, agePolicy: "app:teen" })`
- **THEN** the platform SHALL record the seek start event
- **AND** the platform SHALL apply the age policy for content classification

### Requirement: mediaSeeked action
The mediaSeeked action SHALL signal that the user has completed seeking to a new position with entity identification, final position, and optional age policy.

#### Scenario: Media seeked with position
- **WHEN** the app calls `Metrics.mediaSeeked({ entityId: "video123", position: 120.5 })`
- **THEN** the platform SHALL record the seek complete event
- **AND** the platform SHALL identify the final playback position

#### Scenario: Media seeked with age policy
- **WHEN** the app calls `Metrics.mediaSeeked({ entityId: "video123", position: 120.5, agePolicy: "app:teen" })`
- **THEN** the platform SHALL record the seek complete event
- **AND** the platform SHALL apply the age policy for content classification

### Requirement: mediaRateChanged action
The mediaRateChanged action SHALL signal that media playback rate has changed with entity identification, rate value, and optional age policy.

#### Scenario: Playback rate changed
- **WHEN** the app calls `Metrics.mediaRateChanged({ entityId: "video123", rate: 2.0 })`
- **THEN** the platform SHALL record the rate change event
- **AND** the platform SHALL identify the new playback rate

#### Scenario: Playback rate changed with age policy
- **WHEN** the app calls `Metrics.mediaRateChanged({ entityId: "video123", rate: 2.0, agePolicy: "app:adult" })`
- **THEN** the platform SHALL record the rate change event
- **AND** the platform SHALL apply the age policy for content classification

### Requirement: mediaRenditionChanged action
The mediaRenditionChanged action SHALL signal that media rendition (quality) has changed with entity identification, bitrate, dimensions, optional profile, and optional age policy.

#### Scenario: Rendition changed with quality info
- **WHEN** the app calls `Metrics.mediaRenditionChanged({ entityId: "video123", bitrate: 5000000, width: 1920, height: 1080 })`
- **THEN** the platform SHALL record the rendition change event
- **AND** the platform SHALL identify the new bitrate and resolution

#### Scenario: Rendition changed with profile
- **WHEN** the app calls `Metrics.mediaRenditionChanged({ entityId: "video123", bitrate: 5000000, width: 1920, height: 1080, profile: "high" })`
- **THEN** the platform SHALL record the rendition change event
- **AND** the platform SHALL identify the quality profile

#### Scenario: Rendition changed with age policy
- **WHEN** the app calls `Metrics.mediaRenditionChanged({ entityId: "video123", bitrate: 5000000, width: 1920, height: 1080, agePolicy: "app:child" })`
- **THEN** the platform SHALL record the rendition change event
- **AND** the platform SHALL apply the age policy for content classification

### Requirement: event action
The event action SHALL log a custom event with schema URI, data string, and optional age policy.

#### Scenario: Custom event with schema
- **WHEN** the app calls `Metrics.event({ schema: "http://example.com/schema/custom-event", data: "{\"action\":\"favorite\"}" })`
- **THEN** the platform SHALL record the custom event
- **AND** the platform SHALL associate the event with the schema URI

#### Scenario: Custom event with age policy
- **WHEN** the app calls `Metrics.event({ schema: "http://example.com/schema/custom-event", data: "{\"action\":\"favorite\"}", agePolicy: "app:adult" })`
- **THEN** the platform SHALL record the custom event
- **AND** the platform SHALL apply the age policy for content classification

### Requirement: appInfo action
The appInfo action SHALL send app-specific metrics to the platform with a build identifier.

#### Scenario: App info with build
- **WHEN** the app calls `Metrics.appInfo("1.2.3")`
- **THEN** the platform SHALL record the app info event
- **AND** the platform SHALL identify the app build version

### Requirement: ErrorType enum
The ErrorType enum SHALL classify errors into network, media, restriction, entitlement, and other categories.

#### Scenario: Network error classification
- **WHEN** an error is classified as "network"
- **THEN** the error SHALL represent network-related failures

#### Scenario: Media error classification
- **WHEN** an error is classified as "media"
- **THEN** the error SHALL represent media playback failures

#### Scenario: Restriction error classification
- **WHEN** an error is classified as "restriction"
- **THEN** the error SHALL represent content restriction failures

#### Scenario: Entitlement error classification
- **WHEN** an error is classified as "entitlement"
- **THEN** the error SHALL represent entitlement or authorization failures

#### Scenario: Other error classification
- **WHEN** an error is classified as "other"
- **THEN** the error SHALL represent uncategorized errors

## REMOVED Requirements

### Requirement: page action with pageName
**Reason**: Parameter renamed from pageName to pageId for clarity and consistency
**Migration**: Update calls to use pageId instead of pageName

### Requirement: error action with errorType and errorMessage
**Reason**: Error structure replaced with more comprehensive error information including type, code, description, visibility, parameters, and age policy
**Migration**: Update error calls to use new parameter structure with type, code, description, visible, and optional parameters/agePolicy

### Requirement: event action with eventName and eventData
**Reason**: Event structure replaced with schema URI and data string for better schema validation and age policy support
**Migration**: Update event calls to use schema and data parameters instead of eventName and eventData

### Requirement: appInfo action with agePolicy
**Reason**: appInfo parameter changed from agePolicy to build to focus on build identification rather than content classification
**Migration**: Update appInfo calls to pass build string instead of agePolicy object

### Requirement: ErrorType enum with legacy values
**Reason**: Error classification updated to match current error taxonomy (network, media, restriction, entitlement, other)
**Migration**: Update error type references to use new enum values
