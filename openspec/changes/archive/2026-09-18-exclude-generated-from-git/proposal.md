## Why

The generated/ folder contains auto-generated language headers (TypeScript, Kotlin, C++, Python, ReScript) that can be regenerated from source specs using `npm run generate`. Currently these files are tracked in git, but this creates unnecessary commit noise and repository bloat since they are derived artifacts, not source code. The package/ folder already has a build process that generates the necessary type definitions for distribution, so tracking the generated files is redundant.

## What Changes

- Add `generated/*` to root `.gitignore` to exclude all generated language files from git tracking
- Add `firebolt-inject.d.ts` to root `.gitignore` to exclude the root-level type definition file
- Unstage all currently committed generated files from git
- Preserve the package/ folder and its contents as tracked files (contains hand-authored distribution files)

## Capabilities

### New Capabilities
None - this is a repository configuration change, not an API capability change.

### Modified Capabilities
None - this change does not modify any API requirements or behavior.

## Impact

- **Repository size**: Reduces repository size by excluding generated files from git history
- **Commit noise**: Eliminates unnecessary commits when generated files are regenerated
- **Build process**: No impact - generated files remain in working directory and can be regenerated via `npm run generate`
- **Package distribution**: No impact - package/ folder build process already generates/copies necessary type definitions
- **CI/CD**: No impact - GitHub workflows do not reference the generated folder directly
- **Type definitions**: No impact - type definitions are handled through package build process, not through committed generated files