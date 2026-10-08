## Context

The repository has a Conventional Commits configuration, but no current PR check enforces it. Yocto consumes `v${version}` tags as source references for building the WebKit extension. Applications install `@rdkcentral/firebolt-js-types` from the GitHub Packages npm registry. The existing manual workflow publishes that package, updates its package version from the requested release version, creates the corresponding `v${version}` tag, and creates a GitHub Release. The published, non-draft `v1.0.0` release is therefore the latest valid release baseline; the earlier `v1.0.0-next.5` release is not the latest release. Dry runs use draft `test-v${version}` releases. GitHub merge commits are allowed, so release notes must represent merged PRs rather than merge commit messages. All changes should continue to enter `develop` through pull requests.

## Goals / Non-Goals

**Goals:**
- Enforce a categorized, minimally formatted PR title before merging to `develop`.
- Regenerate title validation when a PR is opened, updated, reopened, or edited.
- Preserve `v${version}` as the shared source tag for Yocto and the corresponding GitHub Packages release.
- Generate detailed release notes from the latest published, non-draft `v${version}` release, excluding draft `test-v${version}` dry runs.
- Include every merged PR between valid JS client releases in the GitHub release notes, without listing merge commits as changes.
- Make the new policy prospective and retain older changes without rewriting history.

**Non-Goals:**
- Rewriting existing commit messages, tags, or published releases.
- Changing API definitions, generators, generated language outputs, or certification-app behavior.
- Requiring individual commits inside a PR to follow the title format; the validated PR title is the change summary.

## Decisions

### Validate the PR title as the canonical change summary

Require `<type>(<scope>): <subject>` for pull requests targeting `develop`. Keep the scopes to `api`, `webkit`, and `tooling`; use `tooling` for documentation and certification-app changes. Keep the conventional type distinct from the scope so release entries retain both change intent and affected area. Reuse the existing commitlint configuration, extending it with the required scope set and non-empty scope rule.

Run this as a lightweight GitHub Actions check on pull-request open, synchronize, reopen, and edit events. The edit event reruns validation when the title changes. Make the check required in the `develop` branch ruleset and require pull requests there. Merge commits remain allowed; their generated messages are not the validated change summary.

### Preserve the Yocto source-tag contract and align npm SemVer

Keep `v${version}` as the canonical Git tag because Yocto resolves it to a source commit and the GitHub Packages release is published from that checkout. Publish `@rdkcentral/firebolt-js-types` to GitHub Packages with SemVer `${version}`; the `v` prefix belongs to the Git tag, not the package version. The workflow may update package metadata to the requested SemVer in its release workspace before publishing. The GitHub release, Yocto source tag, and GitHub Packages version MUST describe the same release version and source checkout.

Keep the established `v${version}` tag format for this package; do not introduce a separate types tag namespace. A valid release baseline is a published, non-draft GitHub Release with a matching `v<semver>` tag. Published prereleases count as valid release boundaries. Draft `test-v${version}` releases are excluded. The existing `v1.0.0` release is the initial baseline and keeps its current title `@rdkcentral/firebolt-js-types@1.0.0`.

Retain the manual workflow's existing tag-existence check. A release MUST fail rather than retarget an occupied tag. Select the prior release from published, non-draft GitHub Releases with valid `v<semver>` tags, not by choosing the numerically or alphabetically greatest tag; the checkout's reachable history constrains the comparison range. An idempotent retry may reuse a tag only when the matching release already exists for the same version and source checkout.

The manual `.github/workflows/release-types.yml` is the release and publication path for the app-consumed package, so implementation should extend that workflow rather than add an assumed public npm or runtime-package deployment.

### Generate one categorized entry per merged PR

For a release, find merged PRs whose merge commits fall in the Git range after the previous valid release tag and through the new `v${version}` tag. Use each PR title as the single change entry, grouped by its validated scope and retaining its conventional type and PR link. Do not emit merge commits as entries; represent each PR once by its title. Include a compare link between the two `v` tags. Generate these notes into a temporary file for the GitHub release body.

Titles from PRs merged before enforcement that do not match the format remain included under an `Other` or `Uncategorized` heading. This preserves the complete first release range without retroactive edits. Generated GitHub Release notes are the release record.

### Keep release orchestration compatible with the current repository

Extend `.github/workflows/release-types.yml` to compute the prior valid release and generate the notes before creating the GitHub Release. Its existing dry-run path must render and validate notes without publishing the package or creating a valid `v${version}` tag. Set GitHub Release prerelease metadata consistently with `-rc` package versions.

## Risks / Trade-offs

- **An older release is mistaken for the latest published release** → Select the previous boundary from published, non-draft GitHub Releases; use `v1.0.0`, not `v1.0.0-next.5`, as the verified current baseline.
- **A tag is overwritten or reused for another source checkout** → Preserve the existing tag-existence guard and fail if the version tag is already occupied.
- **A Yocto consumer cannot resolve its expected tag** → Preserve the exact `v${version}` format for JS releases and test the tag-to-commit resolution used by the Yocto build.
- **A PR is omitted or duplicated when mapping commits to PRs** → Test ranges containing normal PR merges, merge commits, and multiple commits in one PR; emit each merged PR once.
- **The branch ruleset does not require the new check** → Document the repository-level required status check as a release prerequisite and verify it in GitHub settings.
- **Legacy PR titles are not categorized** → Include them under an explicit uncategorized heading rather than dropping them or rewriting history.
- **A dry run creates a draft release or test tag** → Keep dry-run tags outside the JS tag namespace and ensure the valid-baseline selector only accepts non-draft JS client releases.

## Migration Plan

1. Add the PR title check and require its status for pull requests targeting `develop`.
2. Use published `v1.0.0` as the initial release-note baseline; retain `v<version>` tags and the existing duplicate-tag preflight.
3. Extend the manual GitHub Packages release workflow to generate notes from merged PR titles and use them directly as the GitHub Release body.
4. Ensure dry runs only render/validate notes and do not publish or create valid release tags; mark `-rc` releases as prereleases.
5. Validate the generated range and notes, then enable the updated release flow. Roll back by disabling note generation; do not delete or move existing tags or releases.

## Open Questions

None. The app-consumed package and GitHub Packages workflow are identified; `v1.0.0` is the current valid release baseline.