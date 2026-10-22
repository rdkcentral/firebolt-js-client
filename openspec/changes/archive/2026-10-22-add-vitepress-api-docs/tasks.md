# Tasks

## 1. Dependency Installation

- [x] 1.1 Install VitePress and related dependencies (vitepress, vite) to devDependencies and verify package installation succeeds with `npm install`

## 2. Directory Structure Setup

- [x] 2.1 Create docs/ directory structure with .vitepress/, api/, and public/ subdirectories and verify all directories are created
- [x] 2.2 Copy firebolt-logo.png and firebolt-logo-small.png from references/ to docs/public/ and verify both files are present

## 3. VitePress Configuration

- [x] 3.1 Create docs/.vitepress/config.ts with basic VitePress configuration (title, description, head for favicon) and verify config syntax is valid TypeScript
- [x] 3.2 Configure sidebar navigation in config.ts with all 11 API modules (Accessibility, Actions, Advertising, Device, Discovery, Display, Lifecycle2, Localization, Metrics, Network, VideoOutput) and verify sidebar structure is correct
- [x] 3.3 Enable local search in config.ts and verify search configuration is valid
- [x] 3.4 Configure site logo (small) in head section and verify favicon is set correctly

## 4. Conversion Script Implementation

- [x] 4.1 Create scripts/convert-specs-to-docs.cjs with basic file reading from openspec/specs/api/ and verify it can list all spec.md files
- [x] 4.2 Implement YAML frontmatter parsing using js-yaml library and verify it can parse module metadata (module, version, platform, stability, description)
- [x] 4.3 Implement parsing of types array from spec frontmatter and verify it extracts type names and descriptions
- [x] 4.4 Implement parsing of properties array from spec frontmatter and verify it extracts property names, descriptions, and result types
- [x] 4.5 Implement parsing of actions array from spec frontmatter and verify it extracts action names, descriptions, and parameters
- [x] 4.6 Implement parsing of events array from spec frontmatter and verify it extracts event names, descriptions, and parameters
- [x] 4.7 Implement Markdown content generation with proper heading structure (H1 for module, H2 for sections, H3 for items) and verify generated Markdown is valid
- [x] 4.8 Implement VitePress frontmatter generation (title, description) and verify frontmatter is correctly formatted
- [x] 4.9 Implement code block formatting for examples and verify code blocks are properly formatted with language tags
- [x] 4.10 Implement table generation for type properties and verify tables are correctly formatted
- [x] 4.11 Add error handling for missing or malformed spec files and verify script fails gracefully with clear error messages
- [x] 4.12 Add output directory creation (docs/api/) and verify directory is created if it doesn't exist
- [x] 4.13 Integrate all parsing and generation logic into a complete conversion script and verify it generates all 11 module .md files

## 5. Status Badge Components

- [x] 5.1 Create docs/.vitepress/components/StatusBadge.vue component with props for status (stable, experimental, deprecated) and verify component renders correctly
- [x] 5.2 Create docs/.vitepress/components/DeprecationBadge.vue component with props for version and verify component renders correctly
- [x] 5.3 Add styling for badges (colors, spacing) and verify badges are visually distinct
- [x] 5.4 Test badge components in VitePress dev mode and verify they render without errors

## 6. Index Page

- [x] 6.1 Create docs/index.md with landing page content and verify page renders in VitePress dev mode
- [x] 6.2 Add large firebolt-logo.png image to index page and verify logo displays correctly
- [x] 6.3 Add links to API documentation and certification app and verify links navigate correctly
- [x] 6.4 Add brief description of Firebolt and getting started information and verify content is readable

## 7. Build Scripts

- [x] 7.1 Add "docs:convert" script to package.json that runs convert-specs-to-docs.cjs and verify script executes successfully
- [x] 7.2 Add "docs:dev" script to package.json that runs vitepress dev docs and verify dev server starts at localhost:5173
- [x] 7.3 Add "docs:build" script to package.json that runs docs:convert then vitepress build docs and verify build completes successfully
- [x] 7.4 Test all three scripts and verify they work as expected

## 8. GitHub Pages Integration

- [x] 8.1 Modify scripts/generate-github-pages.cjs to copy docs/.vitepress/dist to pub/api-docs (recursive) and verify directory is copied correctly
- [x] 8.2 Test generate:github-pages script and verify pub/ directory contains both certification app and api-docs
- [x] 8.3 Update references/ghpages-index.html to add link to API documentation page and verify link is present

## 9. Local Development Testing

- [x] 9.1 Run npm run docs:dev and verify dev server starts without errors
- [x] 9.2 Open localhost:5173 in browser and verify index page loads with logo
- [x] 9.3 Navigate to API documentation pages and verify all 11 modules are accessible
- [x] 9.4 Test sidebar navigation and verify clicking modules switches pages correctly
- [x] 9.5 Test search functionality (Cmd/Ctrl + K) and verify search finds modules and methods
- [x] 9.6 Test deeplinking by copying URLs with anchors and verify page scrolls to correct section
- [x] 9.7 Test responsive design in browser dev tools (mobile, tablet, desktop) and verify layout adapts correctly
- [x] 9.8 Make a change to a spec.md file, run docs:convert, and verify change appears in dev server with hot reload

## 10. Production Build Testing

- [x] 10.1 Run npm run docs:build and verify build completes without errors
- [x] 10.2 Run npm run docs:preview and verify production build preview starts at localhost:4173
- [x] 10.3 Verify production build matches dev build (content, navigation, search)
- [x] 10.4 Check build output size and verify it's reasonable (< 5MB total)

## 11. Full Pipeline Testing

- [x] 11.1 Run full build pipeline (npm run generate, npm run build, npm test, npm run generate:github-pages) and verify all steps complete successfully
- [x] 11.2 Verify pub/ directory contains index.html, firebolt-cert-app.html, api-docs/, and all certification app assets
- [ ] 11.3 Open pub/index.html in browser and verify both certification app and API docs links work (requires manual browser testing)
- [ ] 11.4 Open pub/api-docs/index.html in browser and verify documentation site works without server (requires manual browser testing)

## 12. Documentation

- [x] 12.1 Add README.md in docs/ directory explaining how to run local development and build documentation and verify instructions are clear
- [x] 12.2 Document conversion script usage and spec format assumptions in scripts/convert-specs-to-docs.cjs comments and verify comments are helpful
- [x] 12.3 Update CONTRIBUTING.md (if exists) with documentation contribution guidelines and verify guidelines are accurate

## 13. Deployment Verification

- [ ] 13.1 Commit all changes and push to develop branch and verify GitHub Actions workflow triggers (requires manual git operations)
- [ ] 13.2 Monitor GitHub Actions workflow run and verify it completes successfully (requires manual monitoring)
- [ ] 13.3 Access published GitHub Pages site and verify both certification app and API docs are accessible (requires manual browser testing)
- [ ] 13.4 Test deeplinks on published site and verify they work correctly (requires manual browser testing)
- [ ] 13.5 Test search on published site and verify it functions correctly (requires manual browser testing)
