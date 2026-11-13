## 1. Generate Certification Inventory and Fixtures

- [x] 1.1 [generator] Add a full-AST certification generator that emits every web/both method with its fully qualified name and call/subscribe kind while excluding native-only methods.
- [x] 1.2 [generator] Generate deterministic primitive fixture values that honor supported string and numeric constraints.
- [x] 1.3 [generator] Generate enum fixture values using the serialized API values.
- [x] 1.4 [generator] Generate object and named-reference fixtures by resolving types, populating required properties, and omitting optional properties by default.
- [x] 1.5 [generator] Generate array and generic-object fixture values and report unsupported shapes that cannot produce usable inputs.
- [x] 1.6 [generator] Add a separate fixture-override source for methods that need semantically meaningful or safer device inputs; do not add test examples to API specs.
- [x] 1.7 [generator] Wire certification inventory and fixture generation into the standard generation command and write the deployable assets under `pub/`.

## 2. Run and Publish the Device Smoke Test

- [x] 2.1 [generator] Update the certification page to load the generated inventory, verify each method exists on the real Firebolt client, invoke methods sequentially, and report per-method outcomes while continuing after failures.
- [x] 2.2 [generator] Treat resolved call promises and accepted subscriptions as passes, provide no-op event callbacks, clean up accepted subscriptions, and keep mock transport out of device certification results.
- [x] 2.3 [generator] Add a GitHub Pages Actions workflow triggered by every push to `develop`; generate current assets, run coverage/fixture validation, and deploy `pub/` only when validation succeeds.
- [x] 2.4 [generator] Configure Pages permissions and the `github-pages` environment, verify deployment by temporarily targeting a test branch, then set the production trigger to `develop`.

## 3. Validate Coverage and Device Behavior

- [x] 3.1 [test] Add a parity test that compares generated certification entries with all methods exposed by the web inject API and detects missing or extra methods.
- [x] 3.2 [test] Test deterministic fixtures for supported parameter types and constraints, separate overrides, and clear failures for methods without usable generated or override values.
- [x] 3.3 [test] Test runner success/failure reporting, subscription cleanup, and continuation after a rejected method.
- [x] 3.4 [test] Run the published certification page on a target device and verify every generated API method receives a successful call response or subscription acknowledgment.