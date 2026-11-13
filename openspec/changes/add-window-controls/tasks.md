## 1. Boundary confirmation

- [x] 1.1 [spec] Confirm Firebolt 9 maps `window.close()` and `window.minimize()` to the native-only `Lifecycle2.close` action, so no `Window` API module is added; verify no OpenRPC or generated file changes (`git status` shows only the app HTML and new test).

## 2. Certification app controls

- [x] 2.1 [generator] Add Minimize and Close buttons and an `invokeWindowControl` helper to `references/firebolt-cert-app.html`; verify each button calls its function once and reports unavailable or throwing functions as failures.
- [x] 2.2 [generator] Add both buttons to the arrow-key navigation list; verify the initial focus is unchanged.
- [x] 2.3 [test] Add `src/certification/window-controls.test.ts` covering the button wiring, navigation, success, unavailable, and throwing cases; verify `npx jest src/certification` passes.

## 3. Integration verification

- [x] 3.1 [test] Run `npm run generate`, `npm run generate:github-pages`, and `npx jest`; verify `pub/firebolt-cert-app.html` contains both buttons and the generated manifest is unchanged.
