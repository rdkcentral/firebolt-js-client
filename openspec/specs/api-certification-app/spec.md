## Purpose
Define the generated inventory, invocation fixtures, device smoke-test behavior, validation, and publishing requirements for the API certification app.
## Requirements
### Requirement: Certification inventory matches the generated web API surface
The certification app SHALL use an inventory generated from the Canonical AST and SHALL include every method exposed by the web inject API. The inventory SHALL include web and both-platform methods and exclude native-only methods.

#### Scenario: A new web API is included automatically
- **WHEN** a method is added to a web or both-platform API definition and the certification inventory is regenerated
- **THEN** the generated inventory MUST include the fully qualified method name and method kind

#### Scenario: Native-only APIs are excluded
- **WHEN** the Canonical AST contains a native-only method
- **THEN** the generated certification inventory MUST NOT include that method

### Requirement: Invocation fixtures are generated separately from API contracts
The certification pipeline SHALL generate deterministic invocation fixtures from API parameter schemas and type definitions without requiring test examples to be added to individual API specs. Fixture overrides MAY be maintained separately for methods that require semantically meaningful values.

#### Scenario: Generic fixture generation handles declared parameters
- **WHEN** a method has parameters whose types can be represented by the fixture generator
- **THEN** the generated fixture MUST provide an invocation value compatible with the declared parameter schema

#### Scenario: Fixture generation cannot construct an invocation
- **WHEN** the fixture generator cannot produce a usable value for a method
- **THEN** validation MUST fail with the fully qualified method name
- **THEN** the method MUST NOT be silently omitted from certification

### Requirement: Device certification runs a real-bridge smoke test
The certification app SHALL invoke every inventory method through the real `FireboltServiceManager` on the device and SHALL report each method's outcome. A fulfilled call promise SHALL count as success regardless of its result value. A subscription SHALL count as success when the device accepts the subscription request; event delivery and result-content validation are not required.

#### Scenario: Call method succeeds
- **WHEN** a call method resolves through the device bridge
- **THEN** the certification report MUST mark that method as passed

#### Scenario: Subscription is accepted without an event
- **WHEN** a subscription request resolves through the device bridge
- **AND** no event is delivered during the test
- **THEN** the certification report MUST mark that method as passed
- **THEN** the runner MUST clean up the subscription

#### Scenario: Method call or subscription fails
- **WHEN** an inventory method rejects or cannot be invoked through the device bridge
- **THEN** the certification report MUST mark that method as failed with its error
- **THEN** the runner MUST continue testing the remaining methods

### Requirement: Certification coverage is checked against the API surface
Continuous integration SHALL verify that generated certification inventory covers the complete web inject API surface and that each inventory entry has a usable fixture before publication.

#### Scenario: API inventory or fixture is incomplete
- **WHEN** a generated API method is missing from the certification inventory or lacks a usable fixture
- **THEN** the validation job MUST fail and identify the affected method
- **THEN** the certification site MUST NOT be published

#### Scenario: API inventory and fixtures are complete
- **WHEN** generated certification entries match the current web inject API surface and all fixtures are usable
- **THEN** the validation job MUST pass

### Requirement: Updated certification app is automatically published
The GitHub Actions publishing workflow SHALL generate and validate the certification inventory and fixtures, run `npm run generate:github-pages` to stage the Pages site in a temporary `pub/` directory, and deploy it to GitHub Pages on every push to `develop`. The separate Pages generation command SHALL copy `references/ghpages-index.html` to `pub/index.html`, copy `references/firebolt-cert-app.html` to `pub/firebolt-cert-app.html`, and stage the runner, generated manifest, and inject bundle at paths used by the app. The staged site SHALL contain a root landing page at `/` linking to the certification app at `/firebolt-cert-app.html`. The `pub/` directory SHALL be deployment output and SHALL NOT be required as a tracked source directory. The workflow's push branch filter MAY target a test branch temporarily during initial deployment verification.

#### Scenario: Commit reaches develop
- **WHEN** any commit is pushed to `develop` and certification validation passes
- **THEN** the workflow MUST publish the staged certification site and generated assets to GitHub Pages
- **THEN** the site root MUST serve a landing page that links to `/firebolt-cert-app.html`

#### Scenario: Pages generation stages source and generated assets
- **WHEN** `npm run generate:github-pages` runs after regular generation
- **THEN** it MUST copy `references/ghpages-index.html` to `pub/index.html`
- **THEN** it MUST stage `firebolt-cert-app.html`, `certification-runner.js`, `api-test-manifest.json`, and `firebolt-inject.js` at the site root
- **THEN** the certification app MUST be available at `/firebolt-cert-app.html` and load its runner and generated assets

#### Scenario: Initial deployment is verified on a test branch
- **WHEN** the workflow's push branch filter is temporarily configured for a test branch and a commit is pushed to that branch
- **THEN** the workflow MUST run generation, validation, staging, and Pages deployment for that commit
- **THEN** the production push branch filter MUST be set to `develop` after verification

#### Scenario: Validation or Pages generation fails
- **WHEN** certification inventory or fixture validation fails, or a required site file is missing while `npm run generate:github-pages` stages the site
- **THEN** the workflow MUST fail before deployment
- **THEN** the workflow MUST NOT deploy a new Pages artifact

