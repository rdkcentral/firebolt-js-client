## Context

The certification app is a single page, `references/firebolt-cert-app.html`, with scroll buttons that are navigated using Left and Right arrow keys. Firebolt 9 documents `window.close()` and `window.minimize()` as web runtime functions mapped to the native `Lifecycle2.close` action (`unload` and `deactivate`). That action is native-only, so the generated web client and certification inventory intentionally exclude it.

## Goals / Non-Goals

**Goals:**

- Provide Minimize and Close buttons reachable with the app's existing navigation.
- Surface unavailable or throwing functions as explicit failures.

**Non-Goals:**

- Adding a generated `Window` API module or changing native-only `Lifecycle2` coverage.
- Changing the certification runner, manifest, or pass/fail summary.

## Decisions

### Call the web runtime functions directly from the page

A small `invokeWindowControl` helper checks that `window[name]` is a function, calls it, and reports the outcome through the existing `addResult` and `log` functions. Reporting happens after the call, so a reporting error is never attributed to the window operation and `window.close()` can unload the page without depending on later updates.

Alternative: add the functions to the generated manifest. Rejected because the manifest is generated from web Firebolt API methods and runs them through the Firebolt client, which would misclassify these runtime functions and alter the certification summary.

### Join the existing arrow-key navigation

Both buttons are added to the existing `allButtons` navigation list, and initial focus is unchanged. Without this, remote users could not reach them.

## Risks / Trade-offs

- **[Browsers or test environments may not provide `window.minimize`, or may block `window.close()`]** → An unavailable function is reported as a failure; a blocked call returns normally and is reported as invoked. The result reflects the call, not the platform's effect.
- **[Manual results appear in the Method Results panel]** → They are not counted in the certification summary.
