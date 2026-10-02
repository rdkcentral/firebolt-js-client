## ADDED Requirements

### Requirement: Generator emits a WebKit builder profile from the Canonical AST
The inject-js generator SHALL provide a WebKit builder profile that uses the same Canonical AST and method-stub generation rules as the regular inject-js target. The WebKit profile SHALL include only modules and methods whose platform is `web` or `both`, and SHALL NOT maintain a separate hand-authored API list.

#### Scenario: API additions flow into both generated targets
- **WHEN** a call or subscribe method is added to a web or both-platform API and the Canonical AST is rebuilt
- **THEN** the regular inject-js target and WebKit builder profile MUST both expose that method using the applicable generated parameter pattern

#### Scenario: Native-only methods are excluded from the WebKit profile
- **WHEN** a method is marked native-only in the Canonical AST
- **THEN** the WebKit builder profile MUST NOT expose that method

#### Scenario: WebKit profile preserves the extension factory contract
- **WHEN** the WebKit builder profile is evaluated by the WebKit JavaScriptCore context
- **THEN** evaluation MUST return the factory function expected by `evaluate_builder_script`
- **THEN** calling the factory with `{ transport, extensionSchema, enableDebug }` MUST return an object with a `build()` method
- **THEN** the profile MUST NOT require the `FireboltServiceManager` bridge to be regenerated