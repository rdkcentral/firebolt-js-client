## ADDED Requirements

### Requirement: Pull requests to develop have categorized titles
The system MUST require pull requests targeting `develop` to use the format `<type>(<scope>): <subject>`, with a non-empty subject and scope. The scope MUST be one of `api`, `webkit`, or `tooling`. Documentation and certification-app changes MUST use the `tooling` scope. The type MUST follow the repository's Conventional Commits configuration.

#### Scenario: Valid categorized title
- **WHEN** a pull request targeting `develop` has a Conventional Commit title with an allowed scope and non-empty subject
- **THEN** title validation passes

#### Scenario: Missing or unsupported scope
- **WHEN** a pull request targeting `develop` has no scope or a scope outside `api`, `webkit`, and `tooling`
- **THEN** title validation fails and the required merge check does not pass

#### Scenario: Title corrected after validation failure
- **WHEN** a pull request title is edited
- **THEN** GitHub Actions reruns title validation against the updated title

#### Scenario: Pull request targets another branch
- **WHEN** a pull request does not target `develop`
- **THEN** the `develop` title policy does not block that pull request

### Requirement: GitHub Packages release preserves the Yocto tag contract
The system MUST use `v${version}` as the canonical Git tag for the app-consumed `@rdkcentral/firebolt-js-types` GitHub Packages release so Yocto can resolve the source commit. The package MUST be published to the GitHub Packages npm registry with SemVer `${version}` from the checkout associated with that tag; the public npm registry MUST NOT be a publication target. The GitHub release MUST identify the same release version and source checkout. Release preflight MUST fail if the requested tag already exists. Existing tags MUST NOT be moved or overwritten.

#### Scenario: Tag and GitHub Packages version identify the same release
- **WHEN** a package release is prepared with version `${version}`
- **THEN** the Git tag is `v${version}` and the GitHub Packages package version is `${version}` from the release checkout

#### Scenario: Yocto resolves the tagged source commit
- **WHEN** Yocto requests a package release using its standard `v${version}` tag
- **THEN** the tag resolves to the source checkout used to publish the corresponding GitHub Packages version

#### Scenario: Tag already exists
- **WHEN** the requested `v${version}` tag already exists
- **THEN** release preflight fails without moving, deleting, or overwriting the tag

#### Scenario: Resolve the initial release baseline
- **WHEN** release notes are generated for the next package release
- **THEN** the baseline is the existing published, non-draft `v1.0.0` release

### Requirement: Release notes include every merged pull request in the valid release range
For each package release, the system MUST generate categorized notes for every pull request merged after the previous valid release and through the new release. A valid previous release MUST be a published, non-draft GitHub Release with a matching `v<semver>` tag; published prereleases count. Each pull request MUST appear exactly once using its title and link, grouped by its scope and retaining its Conventional Commit type. The GitHub release body MUST contain those change entries and a compare link for the selected `v<semver>` range. The notes MUST be generated in the release workflow. Merge commits MUST NOT appear as standalone entries. Draft `test-v<version>` dry runs MUST NOT affect the selected release range.

#### Scenario: Complete categorized release range
- **WHEN** a release range contains merged pull requests with valid categorized titles
- **THEN** every pull request appears once under its scope with its type, title, and link in the generated GitHub release body

#### Scenario: Select the preceding valid release
- **WHEN** release notes are generated and the history contains published releases and draft `test-v...` dry runs
- **THEN** the lower boundary is the latest published, non-draft release with a valid `v<semver>` tag

#### Scenario: Published release candidate
- **WHEN** a `-rc` package version is published
- **THEN** its GitHub Release is marked as a prerelease and remains eligible as a later release-note boundary

#### Scenario: Merge commits are excluded as entries
- **WHEN** the release range contains GitHub-generated merge commits for pull requests
- **THEN** the merge commit messages are omitted and the corresponding pull requests are represented once by their titles

#### Scenario: Legacy titles remain represented
- **WHEN** the release range includes pull requests merged before title enforcement whose titles do not match the format
- **THEN** each such pull request remains in the release notes under an uncategorized section

#### Scenario: No pull request is omitted from a multi-commit merge
- **WHEN** a pull request contributes multiple commits or a merge commit to the release range
- **THEN** the release notes contain one entry for that pull request rather than one entry per commit

### Requirement: Release policy is prospective
The system MUST apply categorized-title validation and the new JS client release-note generation to future changes and releases without rewriting previously merged commits, existing release notes, or existing tags.

#### Scenario: Existing history remains unchanged
- **WHEN** the new release-management policy is enabled
- **THEN** existing commits, tags, and published release bodies remain unchanged