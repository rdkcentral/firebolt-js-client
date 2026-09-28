# Firebolt JS Client

This repository contains the Firebolt API specification authoring tools and code generators for producing type-safe language headers across multiple platforms.

## Quick Start for Spec Updates

If you need to update or add Firebolt API specifications, here's the essential workflow:

```bash
# Install dependencies
npm install

# Generate headers for all modules, all targets
npm run generate

# Generate specific modules + targets
npx ts-node src/cli.ts generate --modules Discovery,Lifecycle2 --targets ts,py

# Generate TypeScript types for the inject-js package
npm run generate:types
```

## Spec Update Workflow

### Using OpenSpec for New API Specifications

For adding new API specifications or making significant changes, use the OpenSpec workflow:

#### 1. Propose a New Change

Use the OpenSpec CLI to create a structured change proposal:

```bash
# Create a new change (openspec CLI required)
openspec new change "add-new-firebolt-api"
```

This creates a scaffolded change directory at `openspec/changes/add-new-firebolt-api/` with configuration files.

#### 2. Generate Change Artifacts

The OpenSpec workflow will guide you through creating necessary artifacts:

- **proposal.md** - What you're building and why
- **design.md** - How you'll implement it
- **specs/** - API specifications for new modules
- **tasks.md** - Implementation steps

Use the Devin skill to generate artifacts:
```
/opsx:propose
```

Or manually create artifacts following the OpenSpec schema.

#### 3. Implement the Change

Once artifacts are ready, implement the tasks:

```bash
# Start implementation
/opsx:apply
```

This will:
- Read the proposal, design, specs, and tasks
- Guide you through each implementation task
- Update task completion status as you progress

#### 4. Verify and Test

After implementation:
- Generate language headers: `npm run generate`
- Run tests: `npm test`
- Verify generated outputs in `generated/` directory

#### 5. Archive the Change

When complete and verified:

```bash
/opsx:archive
```

This moves the change to the archive and marks it as complete.

### Manual Spec Updates

For minor spec updates, you can directly modify files:

#### 1. Author or Update a Spec

Create or modify API specifications in `openspec/specs/api/<module>/spec.md` following the format defined in `openspec/specs/_meta/spec-format.md`.

Key spec elements:
- **Module metadata**: name, version, platform, stability
- **Types**: enums and objects used across the module
- **Properties**: observable platform values (getters/setters/events)
- **Actions**: imperative API calls with parameters and results
- **Events**: standalone subscription events

#### 2. Generate Language Headers

Run the generator to produce language-specific headers:

```bash
# Generate all targets for all modules
npm run generate

# Generate specific targets
npx ts-node src/cli.ts generate --targets ts,cpp,py

# Generate specific modules
npx ts-node src/cli.ts generate --modules Device,Discovery
```

### 3. Verify Generated Output

Check the generated files in the `generated/` directory:

| Target | Output path |
|--------|-------------|
| TypeScript | `generated/ts/<Module>.d.ts` |
| ReScript | `generated/res/<Module>.res` |
| Kotlin/JS | `generated/kt/<Module>.kt` |
| C++ | `generated/cpp/firebolt/<Module>.hpp` |
| Python stub | `generated/py/<module>.pyi` |
| Python protocol | `generated/py/<module>_protocol.py` |

### 4. Publish TypeScript Types Package

To publish the TypeScript definitions package:

```bash
cd package
npm publish
```

The package is published as `@rdkcentral/firebolt-js-types` to GitHub Packages.

## Setting Up for a Pull Request

### 1. Create a Feature Branch

```bash
# Create a new branch for your change
git checkout -b feature/add-new-api-module

# Or for a fix
git checkout -b fix/issue-description
```

### 2. Make Your Changes

- Follow the spec update workflow above
- Make sure to generate headers after spec changes
- Run tests to verify everything works
- Commit your changes with clear messages

### 3. Test Your Changes

```bash
# Run all tests
npm test

# Generate headers to verify output
npm run generate

# Check generated files
ls generated/ts/
ls generated/cpp/firebolt/
```

### 4. Commit Your Changes

```bash
# Stage your changes
git add .

# Commit with a descriptive message
git commit -m "Add new Discovery API module

- Added spec for Discovery module in openspec/specs/api/discovery/
- Generated TypeScript, C++, and Python headers
- Updated package version for publishing"
```

### 5. Push and Create PR

```bash
# Push your branch
git push origin feature/add-new-api-module

# Create a PR via GitHub CLI or web interface
gh pr create --title "Add new Discovery API module" --body "## Summary
- Added Discovery module spec
- Generated language headers
- Ready for review

## Test plan
- [x] All tests pass
- [x] Generated headers verified
- [x] Manual testing completed"
```

### 6. PR Review Guidelines

When submitting a PR for review:

- **Spec Changes**: Include the spec file changes and generated headers
- **Breaking Changes**: Clearly document any breaking API changes
- **Test Results**: Mention that all tests pass
- **Documentation**: Update relevant README sections if needed
- **Version**: Consider if a version bump is needed for the published package

### 7. Post-Merge Cleanup

After your PR is merged:

```bash
# Switch back to main
git checkout main

# Pull latest changes
git pull origin main

# Delete your feature branch
git branch -d feature/add-new-api-module
```

## Publishing the Package

To publish the TypeScript definitions package:

```bash
cd package
npm publish
```

The package is published as `@rdkcentral/firebolt-js-types` to GitHub Packages.

## Prerequisites

- **Node.js** 18+ with npm
- **TypeScript** (installed via `npm install`)
- Optional for output verification:
  - `tsc` — TypeScript
  - `rescript` — ReScript
  - `kotlinc-js` — Kotlin/JS
  - `g++ -std=c++17` — C++
  - `mypy --strict` — Python

## Spec Authoring Guidelines

### Platform Classification

Every spec must declare a `platform` field:

| Value | Generators that run | Use when |
|-------|---------------------|----------|
| `web` | ts · res · kt | API only available to web-based app runtimes |
| `native` | cpp · py | API only available to native SDK integrations |
| `both` | ts · res · kt · cpp · py | API available to all runtimes |

### Type References

Use these primitive types in your specs:
- `bool` — boolean values
- `string` — text values (with optional `format: date-time`)
- `unsigned` — 64-bit unsigned integers
- `double` — 64-bit floating point numbers

Reference types using `$ref`:
```yaml
type:
  $ref: AudioProfile  # Local type
type:
  $ref: "shared:ListenResponse"  # Shared type
```

### Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Module | PascalCase | `Device`, `Lifecycle2` |
| Type | PascalCase | `AudioProfile`, `StateChangedEvent` |
| Property | camelCase | `audioDescription` |
| Action | camelCase | `watched`, `start` |
| Event | camelCase with `on` prefix | `onStateChanged` |
| Param | camelCase | `entityId`, `handlerAppId` |

## Testing

```bash
# Run all tests
npm test
```

## Consuming the Published Package

The Firebolt TypeScript definitions are published as `@rdkcentral/firebolt-js-types` to GitHub Packages.

### Setup for App Developers

1. **Configure npm registry for @rdkcentral scope**

   Create or update `.npmrc` in your project root:
   ```bash
   @rdkcentral:registry=https://npm.pkg.github.com
   ```

2. **Authenticate with GitHub Packages**

   Create a GitHub personal access token:
   - Go to https://github.com/settings/tokens
   - Click "Generate new token" → "Generate new token (classic)"
   - Select the `read:packages` scope
   - Generate and copy the token

   Add the token to your npm configuration (choose one method):

   **Option A: Global npm config (recommended)**
   ```bash
   npm config set //npm.pkg.github.com/:_authToken YOUR_TOKEN_HERE
   ```

   **Option B: Project-specific .npmrc**
   Add to your project's `.npmrc`:
   ```
   //npm.pkg.github.com/:_authToken=YOUR_TOKEN_HERE
   ```

3. **Install the package**

   ```bash
   npm install @rdkcentral/firebolt-js-types@<version>
   ```

   For development:
   ```bash
   npm install @rdkcentral/firebolt-js-types@<version> --save-dev
   ```

### Example package.json

```json
{
  "devDependencies": {
    "@rdkcentral/firebolt-js-types": "0.1.1-rc"
  }
}
```

### Troubleshooting

- **401 Unauthorized**: Ensure your GitHub token has the `read:packages` scope and is correctly configured in npm
- **404 Not Found**: Verify the package version exists and you have access to the @rdkcentral organization
- **Registry configuration**: Ensure your `.npmrc` has the scoped registry configuration for @rdkcentral

## Architecture Overview

The generator follows a pipeline from human-readable specs to language-specific headers:

```
OpenSpec (.md)  →  OpenRPC (.json)  →  Canonical AST  →  Language Headers
    (human)         (derived/AI)         (in-memory)      (.d.ts, .res, .kt, .hpp, .pyi)
```

### Directory Structure

```
src/
├── ast/
│   ├── types.ts          # Canonical AST interfaces
│   ├── builder.ts        # buildAST(): OpenRPC[] → CanonicalAST
│   └── builder.test.ts   # Unit tests for builder rules
├── generators/
│   ├── index.ts          # Generator type, registry, runAll()
│   ├── typescript.ts     # → .d.ts
│   ├── rescript.ts       # → .res
│   ├── kotlin.ts         # → .kt (Kotlin/JS only)
│   ├── cpp.ts            # → .hpp (C++17)
│   ├── python.ts         # → .pyi + _protocol.py
│   └── consistency.test.ts
├── openrpc/
│   ├── shared.json       # ListenResponse + FireboltError schemas
│   ├── discovery.json
│   └── lifecycle2.json
└── cli.ts                # CLI entry point

openspec/
└── specs/
    ├── api/              # API module specifications
    │   ├── discovery/
    │   ├── lifecycle2/
    │   └── ...
    └── _meta/            # Meta guidelines and conventions
        ├── spec-format.md
        └── openrpc-derivation.md

generated/
├── ts/                   # TypeScript .d.ts
├── res/                  # ReScript .res
├── kt/                   # Kotlin .kt
├── cpp/firebolt/         # C++ .hpp + result.hpp
└── py/                   # Python .pyi + _protocol.py
```

## Advanced Usage

### Adding a New Module

1. **Author the spec** — create `openspec/specs/api/<module>/spec.md` following the format in `openspec/specs/_meta/spec-format.md`.

2. **Derive OpenRPC** — following `openspec/specs/_meta/openrpc-derivation.md`, create `src/openrpc/<module>.json`.

3. **Run the generator** — `npx ts-node src/cli.ts generate --modules <Module>`

4. **Verify outputs** — type-check/compile each target as appropriate.

### Adding a New Language Target

1. Create `src/generators/<lang>.ts`.

2. Implement the `Generator` function signature:
   ```ts
   (module: Module, config: GenConfig) => GeneratorOutput[]
   ```

3. At the bottom of the file, call:
   ```ts
   registerGenerator("<id>", generate);
   ```

4. Import the new generator in `src/cli.ts`:
   ```ts
   import "./generators/<lang>";
   ```

5. Pass the new target ID in the `--targets` option:
   ```bash
   npx ts-node src/cli.ts generate --targets ts,res,<id>
   ```

## Consuming the Published Package

The Firebolt TypeScript definitions are published as `@rdkcentral/firebolt-js-types` to GitHub Packages.

### Setup for App Developers

To use the published package in your application:

1. **Configure npm registry for @rdkcentral scope**

   Create or update `.npmrc` in your project root:
   ```bash
   @rdkcentral:registry=https://npm.pkg.github.com
   ```

2. **Authenticate with GitHub Packages**

   Create a GitHub personal access token:
   - Go to https://github.com/settings/tokens
   - Click "Generate new token" → "Generate new token (classic)"
   - Select the `read:packages` scope
   - Generate and copy the token

   Add the token to your npm configuration (choose one method):

   **Option A: Global npm config (recommended)**
   ```bash
   npm config set //npm.pkg.github.com/:_authToken YOUR_TOKEN_HERE
   ```

   **Option B: Project-specific .npmrc**
   Add to your project's `.npmrc`:
   ```
   //npm.pkg.github.com/:_authToken=YOUR_TOKEN_HERE
   ```

3. **Install the package**

   ```bash
   npm install @rdkcentral/firebolt-js-types@<version>
   ```

   For development:
   ```bash
   npm install @rdkcentral/firebolt-js-types@<version> --save-dev
   ```

### Example package.json

```json
{
  "devDependencies": {
    "@rdkcentral/firebolt-js-types": "0.1.1-rc"
  }
}
```

### Troubleshooting

- **401 Unauthorized**: Ensure your GitHub token has the `read:packages` scope and is correctly configured in npm
- **404 Not Found**: Verify the package version exists and you have access to the @rdkcentral organization
- **Registry configuration**: Ensure your `.npmrc` has the scoped registry configuration for @rdkcentral
