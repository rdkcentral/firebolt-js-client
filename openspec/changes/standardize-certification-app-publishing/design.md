## Context

The certification page is currently stored in `pub/` beside generated assets. `npm run generate` copies the manifest, inject bundle, and runner there, and the Pages workflow uploads that directory. This makes a deployment staging directory part of the normal generation path and leaves no root landing page for future site content. The API inventory and bundle already have canonical generated locations under `generated/`; the runner source is `src/certification/runner.js`.

## Goals / Non-Goals

**Goals:**
- Keep maintained Pages HTML under `references/`, with `ghpages-index.html` linking to `firebolt-cert-app.html`.
- Keep certification generation outputs in their existing `generated/` locations and decouple them from Pages assembly.
- Add a dedicated `npm run generate:github-pages` command that assembles a complete, root-relative Pages site in temporary `pub/`.
- Preserve the certification app URL and its relative references to the runner, manifest, and inject bundle.

**Non-Goals:**
- Publish API documentation in this change; the landing page only establishes a place to link to it later.
- Change API inventory generation, fixtures, certification execution behavior, or Pages deployment triggers.

## Decisions

### Keep source pages separate from deployment output

Store the landing page at `references/ghpages-index.html` and the certification app at `references/firebolt-cert-app.html`. The dedicated Pages generation command copies these into the site root as `pub/index.html` and `pub/firebolt-cert-app.html`. This keeps the maintained source filename distinct from the Pages entrypoint, keeps the app URL explicit, and allows future documentation links without making the certification page the site root. A subdirectory for the app was considered, but it would change the current relative asset layout without providing value for this single-page tool.

### Keep generation independent of Pages staging

Remove the `pub/` copies from `npm run generate`. Continue writing the manifest and inject bundle to `generated/certification/` and `generated/inject-js/`, and keep the runner source in `src/certification/runner.js`. Existing unrelated generation steps, including package type output and WebKit builder minification, remain unchanged. Add `npm run generate:github-pages` as a separate staging command that consumes these outputs and recreates `pub/` with the landing page renamed to `index.html`.

### Assemble the site in the publishing workflow

After generation and validation pass, the workflow runs `npm run generate:github-pages`. That command creates `pub/` and copies the two reference pages plus the runner, generated manifest, and inject bundle into it. It then uploads `pub/` as the Pages artifact. Since Actions builds from a fresh checkout and `pub/` is no longer tracked, this directory exists only for that workflow run; a failed generation, test, or staging command prevents site deployment.

The certification page and all three script/data assets remain at the same site-root level, preserving its `./certification-runner.js`, `./api-test-manifest.json`, and `./firebolt-inject.js` references.

## Risks / Trade-offs

- **A required file is omitted during staging** -> Keep the staging list explicit and validate the resulting Pages artifact contains both HTML pages and all three certification assets before upload.
- **A future move changes relative URLs** -> Keep app assets co-located at the Pages root, and update the publishing spec and page references together if that layout changes.
- **Workflow assembly fails after a valid prior deployment** -> Deploy only after generation, tests, and staging succeed; GitHub Pages keeps the prior deployment until a new artifact is deployed.

## Migration Plan

Move the maintained page out of `pub/` and add the landing page under `references/ghpages-index.html`. Remove `pub/` copy operations from the general generation command, add `npm run generate:github-pages`, update the workflow to invoke it after validation, and stop tracking the old publication directory. Verify generation and tests, then verify the uploaded site exposes `/` and `/firebolt-cert-app.html` with the app's generated assets. Rollback can restore the previous workflow and tracked `pub/` artifacts if publication fails.

## Open Questions

None. API documentation content and its eventual URL remain future work.