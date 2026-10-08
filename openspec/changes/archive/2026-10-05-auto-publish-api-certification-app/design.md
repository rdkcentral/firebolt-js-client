## Context

The Firebolt inject bundle is generated from the OpenRPC documents through the Canonical AST. The certification page in `pub/` currently maintains a separate `ALL_METHODS` list and mock responses, so it can drift from the device-facing API surface. CI generates client artifacts and tests generator parity, but there is no GitHub Pages deployment workflow in the repository.

The certification app is intended to run on a device with the real `FireboltServiceManager`. Phase 1 is a smoke test: a call passes when its promise resolves, and an event passes when subscription is accepted. It does not validate result contents or require an event to be emitted.

## Goals / Non-Goals

**Goals:**
- Derive the certification inventory from the same web/both API surface used by the inject generator.
- Generate generic, deterministic invocation fixtures from API parameter schemas without adding examples to individual API specs.
- Run calls and subscriptions against the real device bridge and report success or failure per method.
- Generate and validate the current certification app, then deploy `pub/` on every push to `develop`.
- Support testing the deployment by temporarily targeting a separate branch before configuring `develop` as the production trigger.
- Fail validation when the generated inventory, runtime API surface, or required fixture data is incomplete.

**Non-Goals:**
- Validate returned value contents, business semantics, or event delivery.
- Test native-only APIs or extension APIs not present in the canonical web API definitions.
- Change OpenSpec API contracts to add test-specific examples.
- Replace the existing inject generator or its runtime API behavior.

## Decisions

### Generate the inventory from the Canonical AST

The certification inventory will use the same platform filtering as the inject generator: web and both-platform modules, excluding native-only methods. Each entry will identify the fully qualified method and whether it is a call or subscription. This avoids parsing emitted JavaScript and keeps a single source of truth.

For example, `Device.brandName` is declared in `src/openrpc/device.json`, parsed into the `Device` module by `buildAST`, and emitted by the inject generator. The certification generator will use that same AST method to emit its inventory and fixture, so adding the method to the contract includes it in both outputs.

### Generate fixtures from parameter types

Fixtures will be generated outside the API contract from AST parameter and type information. The generator will produce stable values for supported primitive, enum, object, and array shapes, honoring available constraints and omitting optional object fields by default. Subscription callbacks are supplied by the page runner rather than serialized as fixture data.

When a schema-valid generic value is not meaningful to a device, a separate fixture override will supply the value. OpenRPC remains focused on the API contract; API additions do not require manually adding examples to each spec. CI will reject a method if fixture generation cannot produce a usable invocation.

### Treat resolved calls and accepted subscriptions as smoke-test success

The page will invoke methods sequentially through the real `FireboltServiceManager`. A resolved call promise is a pass, including methods whose successful result is `null`. A subscription is a pass once the subscription request is accepted; the runner will use a no-op callback and clean up the subscription. Rejected calls and subscriptions are reported as failures, and the run continues to cover remaining methods.

The mock transport may remain useful for local page development, but mock results will not count as device certification.

### Validate parity and publish the `pub/` directory with Actions

CI will compare generated certification entries with the web API surface from the AST and ensure fixture generation succeeds. A GitHub Actions Pages workflow will run on every push to `develop`, generate the certification assets, assemble the `pub/` site, and deploy it only after validation succeeds. For initial testing, the push branch filter can temporarily target a test branch; the production trigger will be `develop`. Pull requests continue to run validation without deploying the shared Pages site.

## Risks / Trade-offs

- **Generic values may satisfy the schema but not device semantics** -> Keep overrides in separate fixture data and report method-specific failures; do not modify API specs for test values.
- **Some calls have observable side effects, such as dispatching an action or recording metrics** -> Run certification against a dedicated test device/middleware and use benign fixture overrides where necessary.
- **The Pages workflow may require repository-specific permissions or deployment-environment settings** -> Configure the `github-pages` environment and deployment permissions; keep pull-request validation separate from deployment.
- **A method may resolve successfully with a null or otherwise unexpected payload** -> This is acceptable in Phase 1; result validation is explicitly deferred.

## Migration Plan

No API or runtime migration is required. Generate the inventory and fixtures from the current API definitions, add parity validation, and update the page to consume generated data. Verify the Pages workflow using a test-branch trigger, then set its push trigger to `develop`. If deployment fails, the previously published Pages artifact remains the usable certification app until the workflow is corrected.

## Open Questions

- Which APIs require fixture overrides to avoid unsafe or disruptive behavior on certification devices?