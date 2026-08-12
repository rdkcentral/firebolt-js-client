## ADDED Requirements

### Requirement: CLI exposes a generate command
The CLI SHALL provide a `generate` subcommand that orchestrates the full pipeline:
loads OpenRPC files → optionally validates → builds AST → runs generators → writes output files.

#### Scenario: generate command produces output files
- **WHEN** `firebolt-gen generate --modules Discovery,Lifecycle2 --targets ts,res,kt,cpp,py` is run
- **THEN** the command MUST exit with code 0
- **THEN** output files MUST exist at `generated/ts/Discovery.d.ts`, `generated/ts/Lifecycle2.d.ts`,
  `generated/res/Discovery.res`, `generated/res/Lifecycle2.res`,
  `generated/kt/Discovery.kt`, `generated/kt/Lifecycle2.kt`,
  `generated/cpp/Discovery.hpp`, `generated/cpp/Lifecycle2.hpp`,
  `generated/py/discovery.pyi`, `generated/py/discovery_protocol.py`,
  `generated/py/lifecycle2.pyi`, `generated/py/lifecycle2_protocol.py`

### Requirement: CLI validates OpenRPC before generating by default
The CLI SHALL validate all loaded OpenRPC documents against the OpenRPC 1.2.x schema
before running the AST builder. Validation failures MUST halt execution with a
non-zero exit code and a descriptive error message.

#### Scenario: Invalid OpenRPC document halts generation
- **WHEN** an OpenRPC document fails schema validation
- **THEN** the CLI MUST exit with a non-zero exit code
- **THEN** the CLI MUST print the validation error to stderr identifying the offending file
- **THEN** no output files MUST be written

#### Scenario: Validation can be skipped
- **WHEN** `--validate false` is passed
- **THEN** the CLI MUST skip OpenRPC validation and proceed directly to AST building

### Requirement: CLI accepts module and target filters
The CLI `generate` command SHALL accept `--modules` and `--targets` options to restrict
which modules and language targets are processed.

#### Scenario: Single module filter
- **WHEN** `--modules Discovery` is passed
- **THEN** only `Discovery`-related output files MUST be written
- **THEN** no `Lifecycle2` output files MUST be written

#### Scenario: Single target filter
- **WHEN** `--targets ts` is passed
- **THEN** only `.d.ts` files MUST be written
- **THEN** no `.res`, `.kt`, `.hpp`, or `.py` files MUST be written

### Requirement: CLI reports a non-zero exit code on any pipeline error
Any error in the pipeline (OpenRPC load failure, AST build error, generator error,
file write error) SHALL cause the CLI to exit with a non-zero exit code and print
the error to stderr.

#### Scenario: AST build error (e.g. enum identifier collision)
- **WHEN** the AST builder throws due to an enum identifier collision
- **THEN** the CLI MUST exit with code 1
- **THEN** the CLI MUST print the builder error message to stderr

### Requirement: CLI generate command accepts inject-js as a target
The CLI `generate` subcommand SHALL accept `inject-js` as a valid value in the `--targets` option. When `inject-js` is included (or when no `--targets` filter is specified), the CLI SHALL run the inject-js full-AST generator after all per-module generators and write the output to `<outDir>/inject-js/firebolt-inject.js`.

#### Scenario: inject-js target produces output file
- **WHEN** `firebolt-gen generate --targets inject-js` is run
- **THEN** the command MUST exit with code 0
- **THEN** `generated/inject-js/firebolt-inject.js` MUST exist
- **THEN** no `.d.ts`, `.res`, `.kt`, `.hpp`, or `.py` files MUST be written

#### Scenario: inject-js included in default targets
- **WHEN** `firebolt-gen generate` is run with no `--targets` filter
- **THEN** `generated/inject-js/firebolt-inject.js` MUST be written alongside all other generator outputs

#### Scenario: inject-js target combined with per-module targets
- **WHEN** `firebolt-gen generate --targets ts,inject-js` is run
- **THEN** TypeScript `.d.ts` files MUST be written
- **THEN** `generated/inject-js/firebolt-inject.js` MUST be written
