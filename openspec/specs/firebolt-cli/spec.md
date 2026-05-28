## ADDED Requirements

### Requirement: CLI exposes a generate command
The CLI SHALL provide a `generate` subcommand that orchestrates the full pipeline:
loads OpenRPC files → optionally validates → builds AST → runs generators → writes output files.

#### Scenario: generate command produces output files
- **WHEN** `firebolt-gen generate --modules Discovery,Lifecycle2 --targets ts,res,kt,cpp,py` is run
- **THEN** the command MUST exit with code 0
- **THEN** output files MUST exist at `out/ts/Discovery.d.ts`, `out/ts/Lifecycle2.d.ts`,
  `out/res/Discovery.res`, `out/res/Lifecycle2.res`,
  `out/kt/Discovery.kt`, `out/kt/Lifecycle2.kt`,
  `out/cpp/Discovery.hpp`, `out/cpp/Lifecycle2.hpp`,
  `out/py/discovery.pyi`, `out/py/discovery_protocol.py`,
  `out/py/lifecycle2.pyi`, `out/py/lifecycle2_protocol.py`

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
