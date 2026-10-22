# Proposal

## Why

The Firebolt JavaScript client currently has no published API documentation. Developers must read raw spec files or inspect generated TypeScript definitions to understand available modules, methods, and types. This creates friction for adoption and makes it difficult to share specific API references with stakeholders.

We need a browsable, searchable documentation site that:
- Provides clear API references for all Firebolt 9 modules
- Supports deeplinking to specific modules, methods, and types
- Can be updated sustainably as new APIs are added or existing ones change
- Publishes to the same GitHub Pages instance as the certification app
- Requires no backend infrastructure
- Loads quickly and provides a good user experience

## What Changes

- Integrate VitePress as the documentation framework
- Create a conversion pipeline from OpenSpec spec.md files to VitePress Markdown
- Generate documentation pages for all 11 Firebolt API modules (Accessibility, Actions, Advertising, Device, Discovery, Display, Lifecycle2, Localization, Metrics, Network, VideoOutput)
- Add navigation sidebar with module list
- Implement client-side search for modules and methods
- Add logo branding (large logo on index, small logo on module pages)
- Update GitHub Pages deployment to include VitePress output
- Add link to API docs from the main index page
- Support deeplinking to modules, methods, and types via anchor IDs
- Add visual indicators for API status (stable, experimental, deprecated)

## Capabilities

### New Capabilities
None - this is a documentation infrastructure change with no spec-level behavior changes.

### Modified Capabilities
None - no API behavior changes.

## Impact

- **New dependencies**: VitePress, vite, and related build tools added to devDependencies
- **New scripts**: `docs:dev`, `docs:build`, `docs:convert` added to package.json
- **New directory**: `docs/` added to repository for VitePress content and config
- **Modified scripts**: `generate-github-pages.cjs` updated to include VitePress output
- **Modified workflow**: `publish-certification.yml` unchanged (already runs `generate:github-pages`)
- **New files**:
  - `docs/.vitepress/config.ts` - VitePress configuration
  - `docs/index.md` - Documentation landing page
  - `docs/api/*.md` - Generated API documentation pages
  - `scripts/convert-specs-to-docs.cjs` - Spec to VitePress conversion script
  - `docs/.vitepress/theme/` - Custom theme components (optional)
- **Modified files**:
  - `references/ghpages-index.html` - Add link to API documentation
  - `package.json` - Add VitePress dependencies and scripts
