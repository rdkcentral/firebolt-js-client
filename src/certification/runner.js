(function (global) {
  "use strict";

  async function run(methods, firebolt, onResult) {
    var passed = 0;
    var failed = 0;

    for (var index = 0; index < methods.length; index++) {
      var entry = methods[index];
      var requestTime = Date.now();
      var result = {
        name: entry.name,
        requestTime: requestTime,
        ok: false,
      };

      try {
        var module = firebolt[entry.module];
        var method = module && module[entry.method];
        if (typeof method !== "function") {
          throw new Error("method not found on Firebolt client");
        }

        var args = entry.kind === "subscribe" ? [function () {}] : entry.args;
        if (!Array.isArray(args)) {
          throw new Error("generated fixture arguments must be an array");
        }

        var value = await method.apply(module, args);
        if (entry.kind === "subscribe") {
          if (typeof value !== "function") {
            throw new Error("subscription did not return an unsubscribe function");
          }
          value();
          value = "Subscription accepted; unsubscribe sent";
        }

        passed++;
        result.ok = true;
        result.value = value;
      } catch (error) {
        failed++;
        result.error = error && error.message ? error.message : String(error);
      }

      result.responseTime = Date.now();
      result.duration = result.responseTime - requestTime;
      if (onResult) onResult(result);
    }

    return { passed: passed, failed: failed };
  }

  global.FireboltCertificationRunner = { run: run };
})(typeof window !== "undefined" ? window : globalThis);