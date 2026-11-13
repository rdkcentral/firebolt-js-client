## Why

Commit messages entering `develop` are not consistently categorized, and JS client and types-package releases share Git tag names despite serving different consumers. Yocto uses a `v<version>` Git tag to identify the source commit for its WebKit extension build, while applications consume the JS package by its SemVer version from the GitHub Packages npm registry. The release process must preserve both contracts and produce complete notes for the exact source commit being released.

## What Changes

- Require categorized Conventional Commit titles for pull requests targeting `develop`, using the scopes `api`, `webkit`, and `tooling`. Documentation and certification-app changes use the `tooling` scope.
- Validate PR titles as a required check and rerun validation when a title is edited.
- Preserve `v<version>` as the canonical release tag used by Yocto, and publish `@rdkcentral/firebolt-js-types` to GitHub Packages at SemVer `<version>` from the source checkout associated with that tag.
- Identify valid releases as published, non-draft `v<version>` releases; keep dry-run releases under `test-v<version>` and exclude them from release boundaries.
- Keep the established `@rdkcentral/firebolt-js-types@<version>` release title and include detailed categorized notes for the complete change set since the last valid release.
- Generate each JS client GitHub release's notes from the complete change set since the previous valid JS client release, excluding dry-run releases and merge commits as release entries.
- Preserve the existing tag-existence preflight; a release must fail rather than retarget an occupied `v<version>` tag.
- Apply the new message and release-note expectations prospectively; do not rewrite earlier commits or releases.

## Capabilities

### New Capabilities
- `release-management`: Define PR title standards and the JS client release-note boundary and contents.

### Modified Capabilities

## Impact

- `.commitlintrc.json` and GitHub Actions PR validation workflow(s)
- `.github/workflows/release-types.yml`, the `@rdkcentral/firebolt-js-types` GitHub Packages artifact, and GitHub release body generation
- Dynamic release-note generation for GitHub Releases
- GitHub branch protection or ruleset configuration for `develop`
- No changes to generated APIs or target language outputs

## Pipeline Impact

None. The OpenSpec → OpenRPC → AST → generated-language pipeline is unaffected. No API modules or generator targets are in scope, and no API/generator `_meta` guidelines apply.