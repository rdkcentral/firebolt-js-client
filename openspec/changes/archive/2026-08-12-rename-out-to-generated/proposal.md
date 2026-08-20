## Why

The current default output directory name "out" is semantically misleading. By convention, "out" typically denotes ephemeral build artifacts that are not checked into version control. However, the generated language bindings (TypeScript .d.ts, Kotlin .kt, C++ .hpp, Python .pyi, etc.) are currently checked into the repository and serve as versioned API contracts. A reviewer noted this creates confusion about whether these files should be persisted. Renaming to "generated" makes the directory's purpose clear while maintaining the convention that these are generated artifacts.

## What Changes

- **BREAKING**: Change the default CLI `--outdir` from `"out"` to `"generated"` in `src/cli.ts`
- Rename the `out/` directory to `generated/` in the repository
- Update all file path references in documentation:
  - README.md output path table and architecture diagrams
  - OpenSpec specs that reference output paths (firebolt-cli, header-generation, wpe-inject-js-generator)
- Update test file path references in:
  - `src/generators/inject-js.test.ts`
  - `src/generators/inject-js-infra.test.ts` 
  - `src/generators/consistency.test.ts`
- Update CI/CD workflow files if they reference the directory path
- Update archived change documents for historical accuracy (optional, may preserve as-is)

## Capabilities

### New Capabilities
None - this is an infrastructure/tooling change that does not introduce new API capabilities.

### Modified Capabilities
None - this change does not modify any existing API requirements or behaviors. It only affects the default output location of generated files.

## Impact

- **CLI behavior**: Users running `npx ts-node src/cli.ts generate` without `--outdir` will output to `generated/` instead of `out/` (breaking change)
- **Documentation**: All references to output paths in README and OpenSpec specs need updating
- **Tests**: Test files that validate output at specific paths need path updates
- **CI/CD**: GitHub workflows may need updates if they reference the output directory
- **Backward compatibility**: Users relying on the default "out" directory will need to either migrate their workflows or explicitly use `--outdir out`
