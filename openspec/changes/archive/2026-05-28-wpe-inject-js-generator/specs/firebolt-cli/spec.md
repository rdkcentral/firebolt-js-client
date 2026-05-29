## ADDED Requirements

### Requirement: CLI generate command accepts inject-js as a target
The CLI `generate` subcommand SHALL accept `inject-js` as a valid value in the `--targets` option. When `inject-js` is included (or when no `--targets` filter is specified), the CLI SHALL run the inject-js full-AST generator after all per-module generators and write the output to `<outDir>/inject-js/firebolt-inject.js`.

#### Scenario: inject-js target produces output file
- **WHEN** `firebolt-gen generate --targets inject-js` is run
- **THEN** the command MUST exit with code 0
- **THEN** `out/inject-js/firebolt-inject.js` MUST exist
- **THEN** no `.d.ts`, `.res`, `.kt`, `.hpp`, or `.py` files MUST be written

#### Scenario: inject-js included in default targets
- **WHEN** `firebolt-gen generate` is run with no `--targets` filter
- **THEN** `out/inject-js/firebolt-inject.js` MUST be written alongside all other generator outputs

#### Scenario: inject-js target combined with per-module targets
- **WHEN** `firebolt-gen generate --targets ts,inject-js` is run
- **THEN** TypeScript `.d.ts` files MUST be written
- **THEN** `out/inject-js/firebolt-inject.js` MUST be written
