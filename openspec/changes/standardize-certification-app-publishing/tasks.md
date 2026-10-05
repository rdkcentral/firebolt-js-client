## 1. Keep Pages source in references

- [x] 1.1 [generator] Move the maintained certification page to `references/firebolt-cert-app.html` and add `references/ghpages-index.html` linking to it.
- [x] 1.2 [generator] Remove the certification asset copy operations from `npm run generate` while preserving the other generation outputs.
- [x] 1.3 [generator] Add `npm run generate:github-pages` to stage the reference pages and generated assets in `pub/`, copying `ghpages-index.html` to `index.html`.
- [x] 1.4 [generator] Update the Pages workflow to run `npm run generate:github-pages` after generation and validation, then upload `pub/`.
- [x] 1.5 [generator] Remove the tracked `pub/` source and generated files.

## 2. Verify publishing behavior

- [x] 2.1 [test] Verify generation still produces the manifest and inject bundle in `generated/` without creating `pub/`.
- [x] 2.2 [test] Run `npm run generate:github-pages` and verify `pub/` contains both HTML pages and all certification assets with working relative paths.
- [x] 2.3 [test] Run the build and test suite and verify the workflow deploys only after generation, validation, and site staging succeed.