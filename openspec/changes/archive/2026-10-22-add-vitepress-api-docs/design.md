# Design

## Context

The project currently has:
- OpenSpec spec files in `openspec/specs/api/<module>/spec.md` (11 modules)
- A GitHub Pages deployment workflow that publishes the certification app
- A simple index page at `references/ghpages-index.html` with a single link to the certification app
- Logo assets: `firebolt-logo.png` (large) and `firebolt-logo-small.png`

The build pipeline:
1. `npm run generate` - Generates TypeScript, ReScript, and other language headers from specs
2. `npm run build` - Compiles TypeScript
3. `npm run generate:github-pages` - Copies certification app assets to `pub/` directory
4. GitHub Actions workflow deploys `pub/` to GitHub Pages

No documentation site currently exists. Developers must read raw spec files or inspect generated `.d.ts` files.

## Goals / Non-Goals

**Goals:**
- Generate browsable HTML documentation from OpenSpec spec files
- Provide client-side search for modules and methods
- Support deeplinking to modules, methods, and types
- Publish to the same GitHub Pages instance as the certification app
- Enable local preview with hot reload during development
- Maintain single source of truth (spec.md files)
- Add visual indicators for API status (stable, experimental, deprecated)
- Use appropriate logos (large on index, small on module pages)

**Non-Goals:**
- Multi-version documentation (single version for Firebolt 9.0)
- Interactive API playground or code execution
- Authentication or access control
- Backend infrastructure or external services
- Custom branding beyond logo usage
- Content editing through web UI (all edits via spec.md files)

## Decisions

### 1. Documentation Framework: VitePress

**Decision:** Use VitePress as the static site generator.

**Rationale:**
- Fast development experience with hot reload (Vite-based)
- Built-in client-side search (no external dependencies)
- Markdown-based content (aligns with existing spec.md format)
- Static generation (no runtime overhead, no backend)
- Well-maintained with regular security updates
- Customizable via Vue components for status badges
- Auto-generated anchors for all headings (enables deeplinking)

**Alternatives considered:**
- Custom HTML generator: Would require implementing search, navigation, and styling from scratch. Lower dependency count but higher maintenance burden.
- Docusaurus: More feature-rich but heavier weight. VitePress is sufficient for API docs.
- TypeDoc: Designed for TypeScript documentation, not spec files. Would require intermediate TS generation step.

### 2. Content Generation: Auto-Conversion from spec.md

**Decision:** Create a conversion script that transforms OpenSpec spec.md files to VitePress Markdown format on each build.

**Rationale:**
- Single source of truth - spec.md remains the authoritative API definition
- Sustainable - adding a new API is just editing the spec file
- No manual duplication between specs and docs
- Consistent formatting across all modules
- Can be run as part of the build pipeline

**Conversion approach:**
```
openspec/specs/api/<module>/spec.md
  → Parse YAML frontmatter (module metadata, types, properties, actions, events)
  → Parse Markdown content (descriptions, examples)
  → Generate VitePress .md with:
    - Frontmatter for title, description
    - H1 for module name
    - H2 for sections (Properties, Actions, Events, Types)
    - H3 for individual items with auto-generated IDs
    - Code blocks for examples
    - Tables for type properties
```

**Alternatives considered:**
- Manual curation: Better UX but requires manual sync. Not sustainable long-term.
- Direct spec.md consumption: VitePress can't parse YAML frontmatter the way we need it.

### 3. File Structure

**Decision:**
```
docs/
├── .vitepress/
│   ├── config.ts          # VitePress configuration
│   ├── theme/
│   │   └── index.ts       # Custom theme (optional, for status badges)
│   └── components/
│       ├── DeprecationBadge.vue
│       └── StatusBadge.vue
├── index.md               # Landing page with large logo
├── api/
│   ├── accessibility.md   # Generated from spec.md
│   ├── device.md
│   └── ...
└── public/
    └── firebolt-logo.png  # Copied from references/
```

**Rationale:**
- Standard VitePress structure
- Separates generated content (`api/`) from hand-written content (`index.md`)
- Custom components for visual status indicators
- Public directory for static assets (logos)

### 4. Navigation Structure

**Decision:** Sidebar navigation with module list.

**Configuration:**
```typescript
// docs/.vitepress/config.ts
sidebar: {
  '/api/': [
    {
      text: 'API Documentation',
      items: [
        { text: 'Accessibility', link: '/api/accessibility' },
        { text: 'Actions', link: '/api/actions' },
        // ... all modules
      ]
    }
  ]
}
```

**Rationale:**
- Familiar documentation pattern
- Easy to navigate between modules
- Auto-generated from spec directory listing

### 5. Search Implementation

**Decision:** Use VitePress built-in local search.

**Configuration:**
```typescript
// docs/.vitepress/config.ts
search: {
  provider: 'local'
}
```

**Rationale:**
- No external dependencies
- No API keys or services
- Fast client-side search
- Searches titles, headings, and content
- Keyboard shortcut (Cmd/Ctrl + K)

**Alternatives considered:**
- Algolia DocSearch: Better UX but requires external service and API key.
- Custom JavaScript search: More work, less polished.

### 6. Deeplinking Strategy

**Decision:** Rely on VitePress auto-generated heading anchors.

**Implementation:**
- Module pages: `/api/accessibility.html`
- Methods: `/api/accessibility.html#audiodescription` (H3 anchor)
- Types: `/api/accessibility.html#closedcaptionssettings` (H3 anchor)

**Rationale:**
- VitePress automatically generates IDs for all headings
- No custom implementation needed
- Stable IDs based on heading text

### 7. Logo Usage

**Decision:**
- Index page (`docs/index.md`): Large logo (`firebolt-logo.png`)
- Module pages: Small logo in site header (`firebolt-logo-small.png`)

**Implementation:**
```typescript
// docs/.vitepress/config.ts
head: [
  ['link', { rel: 'icon', href: '/firebolt-logo-small.png' }]
]
```

**Rationale:**
- Matches user requirements
- Consistent with branding guidelines

### 8. GitHub Pages Integration

**Decision:** Modify `scripts/generate-github-pages.cjs` to include VitePress output.

**Implementation:**
```javascript
const files = [
  // Existing files
  ["references/ghpages-index.html", "index.html"],
  ["references/firebolt-cert-app.html", "firebolt-cert-app.html"],
  // ... existing files

  // New: VitePress output
  ["docs/.vitepress/dist", "api-docs", { recursive: true }],
];
```

**Rationale:**
- Minimal change to existing workflow
- VitePress output is static files, can be copied like other assets
- No changes to GitHub Actions workflow needed

### 9. Build Scripts

**Decision:** Add three new npm scripts:

```json
{
  "scripts": {
    "docs:convert": "node scripts/convert-specs-to-docs.cjs",
    "docs:dev": "vitepress dev docs",
    "docs:build": "npm run docs:convert && vitepress build docs"
  }
}
```

**Rationale:**
- `docs:convert` - Separate step for clarity, can be called independently
- `docs:dev` - Local development with hot reload
- `docs:build` - Production build (converts then builds)

### 10. Status Indicators

**Decision:** Create Vue components for visual status badges.

**Components:**
- `<StatusBadge status="stable" />` - Green badge
- `<StatusBadge status="experimental" />` - Yellow badge
- `<DeprecationBadge version="10.0" />` - Red badge with version

**Usage in generated docs:**
```markdown
### audioDescription <StatusBadge status="stable" />
```

**Rationale:**
- VitePress supports custom Vue components
- Visual indicators help developers understand API stability
- Future-proof for when APIs are deprecated

## Risks / Trade-offs

### Risk 1: VitePress Dependency Updates

**Risk:** VitePress dependency may introduce breaking changes in future versions.

**Mitigation:**
- Pin VitePress version in package.json
- Monitor release notes for breaking changes
- Test thoroughly before upgrading

### Risk 2: Conversion Script Maintenance

**Risk:** Conversion script may break if spec.md format changes.

**Mitigation:**
- Keep conversion logic simple and focused
- Add validation to detect unsupported spec features
- Document the spec format assumptions in the conversion script

### Risk 3: Search Performance

**Risk:** Client-side search may be slow with many modules and methods.

**Mitigation:**
- VitePress search is optimized for documentation
- Test with all 11 modules loaded
- If problematic, consider Algolia DocSearch as fallback

### Trade-off: Build Time Increase

**Trade-off:** Adding VitePress build step increases overall build time.

**Mitigation:**
- VitePress builds are fast (static generation)
- Only affects GitHub Actions workflow, not local development
- Can be parallelized with other build steps if needed

### Trade-off: Dependency Bloat

**Trade-off:** VitePress adds ~200KB to node_modules.

**Mitigation:**
- Dev dependency only (not in production bundle)
- Value outweighs cost (polished docs, search, navigation)
- Alternative (custom HTML) would require more maintenance

## Migration Plan

1. Install VitePress dependencies
2. Create `docs/` directory structure
3. Implement conversion script (`scripts/convert-specs-to-docs.cjs`)
4. Create VitePress config (`docs/.vitepress/config.ts`)
5. Create index page (`docs/index.md`)
6. Create status badge components
7. Test local development (`npm run docs:dev`)
8. Update `generate-github-pages.cjs` to include VitePress output
9. Update `references/ghpages-index.html` to link to API docs
10. Test full build pipeline
11. Deploy to GitHub Pages (on develop branch)
12. Verify published site

**Rollback strategy:**
- Revert `generate-github-pages.cjs` changes
- Remove VitePress dependencies from package.json
- Delete `docs/` directory
- Certification app continues to work independently

## Open Questions

None - all technical decisions are clear and can be implemented as described.
