## 1. Commit title policy

- [x] 1.1 [spec] Extend commitlint configuration with mandatory `api`, `webkit`, and `tooling` scopes while preserving the current Conventional Commit type and subject rules.
- [x] 1.2 [spec] Document the required PR title format and scope guidance, including that documentation and certification-app changes use `tooling`.
- [x] 1.3 [generator] Add a lightweight GitHub Actions PR-title check for `develop` on open, synchronize, reopen, and edit events; verify title edits rerun the check.
- [ ] 1.4 [generator] Configure the `develop` branch ruleset to require the title check and require pull requests.

## 2. JS client release contract and notes

- [x] 2.1 [generator] Identify `@rdkcentral/firebolt-js-types` as the app-consumed GitHub Packages artifact and `.github/workflows/release-types.yml` as its manual publication path.
- [x] 2.2 [generator] Verify `v1.0.0` as the latest published, non-draft release baseline and confirm the existing workflow's tag-existence guard.
- [x] 2.3 [generator] Preserve Yocto-compatible `v${version}` tags and publish the GitHub Packages artifact at SemVer `${version}` from the release checkout.
- [x] 2.4 [generator] Keep valid releases on `v${version}` and dry-run releases on `test-v${version}`; do not create a separate types-package namespace.
- [x] 2.5 [generator] Select the previous published, non-draft release with a valid `v<semver>` tag, excluding draft dry-run releases.
- [x] 2.6 [generator] Generate one categorized entry per merged PR in the valid tag range, grouping by scope, retaining type/title/link, excluding merge commits as standalone entries, and placing legacy titles in an uncategorized section.
- [x] 2.7 [generator] Generate release notes dynamically for the GitHub release body; keep dry-run output from publishing or creating a valid release tag.

## 3. Verification

- [x] 3.1 [test] Test release-boundary selection across published v-tags, prereleases, draft releases, and test-v dry-run tags.
- [x] 3.2 [test] Test version/tag/package checks for exact SemVer alignment and the GitHub Packages registry.
- [x] 3.3 [test] Test Yocto-style `v${version}` tag resolution to the package source checkout.
- [x] 3.4 [test] Test PR-to-release-note mapping for merge commits, multiple commits per PR, legacy titles, scope grouping, and exactly-once inclusion.
- [x] 3.5 [test] Run a release dry run for a known range and verify the generated GitHub body without publishing or creating a valid release.