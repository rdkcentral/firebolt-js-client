## ADDED Requirements

### Requirement: A FullASTGenerator type accepts the full CanonicalAST
The generator infrastructure SHALL define a `FullASTGenerator` type with the signature `(ast: CanonicalAST, config: GenConfig) => GeneratorOutput[]`. It SHALL be registered via `registerFullASTGenerator(id, gen, targetPlatform)` and dispatched via `runAllFullAST(ast, config, targets?)`. A full-AST generator receives the complete `CanonicalAST` once per run, not once per module.

#### Scenario: FullASTGenerator is invoked once per run
- **WHEN** `runAllFullAST` is called with an AST containing three modules
- **THEN** the registered full-AST generator MUST be called exactly once
- **THEN** it MUST receive the full AST object (all three modules accessible)

#### Scenario: FullASTGenerator platform filtering applies at run time
- **WHEN** a full-AST generator is registered with `targetPlatform: "web"`
- **WHEN** `runAllFullAST` is called and a `"native"`-only module exists in the AST
- **THEN** the generator is still called once with the full AST (platform filtering is the generator's responsibility, not the registry's)

#### Scenario: FullASTGenerator target filter works
- **WHEN** `runAllFullAST` is called with `targets: ["inject-js"]`
- **THEN** only the `inject-js` generator MUST be invoked
- **THEN** no per-module generators MUST be called by `runAllFullAST`
