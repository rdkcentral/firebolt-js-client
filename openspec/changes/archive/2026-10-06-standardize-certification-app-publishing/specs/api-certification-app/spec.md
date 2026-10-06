## MODIFIED Requirements

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