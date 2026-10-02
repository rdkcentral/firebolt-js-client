## ADDED Requirements

### Requirement: The standard generation workflow produces the extension resource
The JavaScript generation workflow SHALL produce a readable WebKit builder intermediate under `generated/inject-js/` and a minified `webkitExtension/resources/firebolt-builder.js` from the current Canonical AST. The GResource bundle SHALL consume the minified resource at that path.

#### Scenario: An API update refreshes the extension resource
- **WHEN** the standard generation workflow runs after an API definition changes
- **THEN** the readable WebKit intermediate and minified extension resource MUST be regenerated from the current OpenRPC-derived Canonical AST

#### Scenario: GResource embeds the generated production artifact
- **WHEN** the WebKit GResource bundle is compiled
- **THEN** its `firebolt-builder.js` entry MUST resolve to the generated minified resource

---

### Requirement: Production minification is reproducible and preserves runtime compatibility
The production builder SHALL be minified using deterministic, declared build tooling and SHALL remain compatible with the supported WebKit JavaScriptCore runtime. Repeating generation with the same AST and tool configuration SHALL produce byte-identical output.

#### Scenario: Repeated generation is deterministic
- **WHEN** the production builder is generated more than once from the same AST and minifier configuration
- **THEN** each generated resource MUST be byte-for-byte identical

#### Scenario: Minified output executes on the supported runtime
- **WHEN** the minified resource is evaluated in the supported JavaScriptCore test environment
- **THEN** it MUST evaluate successfully and return the extension factory function

---

### Requirement: Minification preserves generated builder behavior
The minified production resource SHALL preserve the behavior of its readable WebKit intermediate, including the factory and build contract, JSON-RPC method calls, extension schema loading, event delivery and cancellation, and cleanup behavior.

#### Scenario: Minified and readable artifacts behave equivalently
- **WHEN** equivalent mock transports and responses are used with the readable and minified artifacts
- **THEN** both artifacts MUST expose the same web and both-platform API surface and produce equivalent RPC, subscription, cancellation, and cleanup behavior

---

### Requirement: CI enforces parity with the generated inject-js bundle
CI SHALL generate the generic `firebolt-inject.js` bundle and WebKit builder from the same Canonical AST and fail when their web/both API surfaces, parameter patterns, or shared RPC/event behavior differ. The comparison SHALL allow the documented WebKit factory-entry-point adaptation and production minification; it SHALL NOT require byte-for-byte equality.

#### Scenario: API surface mismatch fails CI
- **WHEN** a web or both-platform module, method, event, or parameter pattern appears differently in the WebKit builder and generic inject-js output
- **THEN** the parity check MUST fail and identify the mismatch

#### Scenario: Shared runtime behavior mismatch fails CI
- **WHEN** the same mock transport interaction produces different shared RPC or event behavior in the WebKit builder and generic inject-js output
- **THEN** the parity check MUST fail and identify the failing behavior

#### Scenario: Intentional wrapper and minification differences pass
- **WHEN** the two outputs differ only in the documented factory exposure or minified formatting
- **THEN** the parity check MUST pass

#### Scenario: Regeneration detects a stale committed resource
- **WHEN** CI runs the standard generation workflow and the committed minified resource differs from generated output
- **THEN** CI MUST fail and identify the extension resource as stale
