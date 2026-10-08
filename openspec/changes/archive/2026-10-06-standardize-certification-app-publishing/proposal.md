## Why

The certification page currently lives in `pub/`, which mixes maintained source with deployment output and couples `npm run generate` to Pages assembly. Moving the source page into `references/` and staging the complete site only during publishing gives the app a clear home while leaving room for API documentation and other Pages content.

## What Changes

- Move the maintained certification page to `references/firebolt-cert-app.html` and add a `references/ghpages-index.html` landing page linking to it.
- Keep generated certification artifacts under `generated/` and stop copying them into `pub/` as part of the general generation command.
- Add a separate `npm run generate:github-pages` command to assemble a temporary `pub/` site, copying `ghpages-index.html` to the published `index.html` alongside the app and generated assets.
- Have the Pages workflow run the GitHub Pages generation command after generation and validation, then publish `pub/`.
- Remove the tracked `pub/` directory and update the certification publishing requirements to describe staged multi-page publishing.

## Capabilities

### New Capabilities

### Modified Capabilities
- `api-certification-app`: Define the published landing page, named certification app URL, and workflow assembly from source and generated assets into temporary Pages output.

## Impact

- Certification source page and new Pages landing page under `references/`
- `package.json` generation scripts and `.github/workflows/publish-certification.yml`
- `api-certification-app` OpenSpec requirement and publishing validation
- Tracked deployment artifacts currently under `pub/`