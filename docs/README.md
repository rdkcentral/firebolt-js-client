# Firebolt API Documentation

This directory contains the VitePress-based API documentation for Firebolt 9.

## Development

### Local Development

To run the documentation site locally with hot reload:

```bash
npm run docs:dev
```

The dev server will start at `http://localhost:5173`.

### Building Documentation

To build the documentation for production:

```bash
npm run docs:build
```

This will:
1. Convert OpenSpec spec files to VitePress Markdown
2. Build the static site
3. Output to `docs/.vitepress/dist/`

### Converting Specs Only

To convert spec files to Markdown without building:

```bash
npm run docs:convert
```

## Content Structure

- `index.md` - Landing page with overview and getting started
- `api/*.md` - Generated API documentation pages (auto-generated from spec files)
- `.vitepress/config.mjs` - VitePress configuration
- `.vitepress/components/` - Custom Vue components (status badges)
- `public/` - Static assets (logos)

## Adding New APIs

API documentation is auto-generated from OpenSpec spec files in `openspec/specs/api/<module>/spec.md`.

To add a new API:
1. Create or update the spec file in `openspec/specs/api/<module>/spec.md`
2. Run `npm run docs:convert` to regenerate the documentation
3. The new API will appear in the generated documentation

## Updating Sidebar Navigation

The sidebar navigation is configured in `.vitepress/config.mjs`. To add a new module:

```javascript
sidebar: {
  '/api/': [
    {
      text: 'API Documentation',
      items: [
        { text: 'NewModule', link: '/api/new-module' },
        // ... other modules
      ]
    }
  ]
}
```

Note: The link should match the generated filename (PascalCase module name converted to kebab-case).

## Deployment

The documentation is deployed to GitHub Pages as part of the `generate:github-pages` script. The built documentation is copied to `pub/api-docs/` and deployed alongside the certification app.
