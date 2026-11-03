## ADDED Requirements

### Requirement: Window controls are available in the certification app
The certification app SHALL display Minimize and Close buttons that can be focused and activated with the same remote or keyboard navigation as its existing controls.

#### Scenario: Certification app loads
- **WHEN** the certification app is rendered
- **THEN** a Minimize button and a Close button are visible
- **THEN** Left and Right arrow navigation reaches both buttons along with the existing scroll buttons

### Requirement: Window controls invoke the matching web runtime functions
The certification app SHALL call `window.minimize` from the Minimize button and `window.close` from the Close button once per activation. These controls SHALL NOT be added to the generated certification inventory or change the certification run summary.

#### Scenario: User minimizes the window
- **WHEN** the user activates the Minimize button
- **THEN** the app invokes `window.minimize` exactly once

#### Scenario: User closes the window
- **WHEN** the user activates the Close button
- **THEN** the app invokes `window.close` exactly once

#### Scenario: Window controls are used during certification
- **WHEN** a window control is activated
- **THEN** the generated inventory and the passed/failed certification summary remain unchanged

### Requirement: Window control failures are reported
The certification app SHALL report an unavailable or throwing window function as a failure, preserving the error message, and SHALL NOT report it as a success.

#### Scenario: Window function returns
- **WHEN** the selected window function is available and returns without throwing
- **THEN** the app records the control as successful in the existing results and log panels

#### Scenario: Window function is unavailable or throws
- **WHEN** the selected window function is unavailable or throws
- **THEN** the app records a failure with the unavailable or thrown error message in the existing results and log panels
