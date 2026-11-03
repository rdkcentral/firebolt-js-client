## Why

The Firebolt web certification app has no way to exercise the web runtime's `window.minimize()` and `window.close()` functions. Adding Minimize and Close buttons lets testers trigger them on a device alongside the existing certification controls.

## What Changes

- Add a **Minimize** button that calls `window.minimize()` and a **Close** button that calls `window.close()`.
- Include both buttons in the app's existing arrow-key navigation.
- Report an unavailable or throwing function as a failure in the existing results and log panels.
- Keep these controls outside the generated certification inventory and run summary.

## Capabilities

### New Capabilities

### Modified Capabilities
- `api-certification-app`: Add window-control buttons and their invocation and failure-reporting behavior.

## Impact

- `references/firebolt-cert-app.html`, which `npm run generate:github-pages` stages as the published certification app.
- A behavior test for the controls in `src/certification/`.
- No generated API, runner, manifest, or dependency changes.

## Pipeline Impact

None. Firebolt 9 documents `window.close()` and `window.minimize()` as web runtime functions that map to the native-only `Lifecycle2.close` action, so they are not Firebolt client methods. The OpenSpec → OpenRPC → AST → generated-language pipeline is unaffected and no `Window` module is added.
