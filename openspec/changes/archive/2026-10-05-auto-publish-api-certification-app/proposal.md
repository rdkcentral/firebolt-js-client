## Why

The device certification page keeps its API inventory and invocation data separate from the generated Firebolt API surface, so new APIs can be omitted from device validation. Automatically deriving the smoke-test app from the current web API contract and publishing it with API updates keeps device certification aligned with the client.

## What Changes

- Generate a certification test inventory and generic invocation fixtures from the current web/both API definitions, without adding test examples to individual OpenSpec API contracts.
- Update the certification page to invoke APIs through the real `FireboltServiceManager` on a device and report per-method success or failure. A resolved call or accepted event subscription is a smoke-test success; event delivery and response-value validation are out of Phase 1 scope.
- Add a GitHub Actions workflow that generates and validates the certification assets, then deploys `pub/` whenever a commit is pushed to `develop`.
- Allow the workflow's push branch filter to target another branch temporarily for initial deployment testing, then set it to `develop`.
- Add validation that the generated certification inventory covers the complete current web API surface and that required fixture data can be produced.

## Capabilities

### New Capabilities
- `api-certification-app`: Generated and automatically published device smoke-test app for the current web Firebolt APIs.

### Modified Capabilities

## Impact

- API AST/generation pipeline and its tests
- `pub/firebolt-web-ca.html` and generated certification assets
- CI, GitHub Actions, and GitHub Pages configuration
- Device certification behavior for call and subscription methods