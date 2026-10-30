import * as fs from "fs";
import * as path from "path";
import * as vm from "vm";

interface RunnerResult {
  name: string;
  ok: boolean;
  value?: unknown;
  error?: string;
  duration: number;
}

interface CertificationRunner {
  run: (
    methods: Array<Record<string, unknown>>,
    firebolt: Record<string, Record<string, unknown>>,
    onResult: (result: RunnerResult) => void,
  ) => Promise<{ passed: number; failed: number }>;
}

function loadRunner(): CertificationRunner {
  const sourcePath = path.resolve(__dirname, "runner.js");
  const context: { window: Record<string, unknown> } = { window: {} };
  vm.runInNewContext(fs.readFileSync(sourcePath, "utf8"), context);
  return context.window.FireboltCertificationRunner as CertificationRunner;
}

describe("certification runner", () => {
  test("runs calls sequentially and counts a resolved null as success", async () => {
    const runner = loadRunner();
    const received: unknown[] = [];
    const results: RunnerResult[] = [];
    const firebolt = {
      Metrics: {
        ready: async (...args: unknown[]) => {
          received.push(args);
          return null;
        },
      },
    };

    const summary = await runner.run([{
      name: "Metrics.ready",
      module: "Metrics",
      method: "ready",
      kind: "call",
      args: [],
    }], firebolt, (result) => results.push(result));

    expect(summary).toEqual({ passed: 1, failed: 0 });
    expect(received).toEqual([[]]);
    expect(results[0]).toMatchObject({ name: "Metrics.ready", ok: true, value: null });
  });

  test("counts an accepted subscription and invokes its unsubscribe function", async () => {
    const runner = loadRunner();
    let callback: unknown;
    let unsubscribed = false;
    const result: RunnerResult[] = [];
    const firebolt = {
      Network: {
        onConnectedChanged: async (listener: unknown) => {
          callback = listener;
          return () => { unsubscribed = true; };
        },
      },
    };

    const summary = await runner.run([{
      name: "Network.onConnectedChanged",
      module: "Network",
      method: "onConnectedChanged",
      kind: "subscribe",
      args: [],
    }], firebolt, (entry) => result.push(entry));

    expect(summary).toEqual({ passed: 1, failed: 0 });
    expect(typeof callback).toBe("function");
    expect(unsubscribed).toBe(true);
    expect(result[0].value).toContain("Subscription accepted");
  });

  test("reports failures and continues with later methods", async () => {
    const runner = loadRunner();
    const results: RunnerResult[] = [];
    const firebolt = {
      Actions: {
        start: async () => { throw new Error("denied"); },
      },
      Network: {
        connected: async () => true,
      },
    };

    const summary = await runner.run([
      { name: "Actions.start", module: "Actions", method: "start", kind: "call", args: [{}] },
      { name: "Device.missing", module: "Device", method: "missing", kind: "call", args: [] },
      { name: "Network.connected", module: "Network", method: "connected", kind: "call", args: [] },
    ], firebolt, (result) => results.push(result));

    expect(summary).toEqual({ passed: 1, failed: 2 });
    expect(results.map((result) => result.name)).toEqual([
      "Actions.start",
      "Device.missing",
      "Network.connected",
    ]);
    expect(results[0]).toMatchObject({ ok: false, error: "denied" });
    expect(results[1]).toMatchObject({ ok: false, error: "method not found on Firebolt client" });
    expect(results[2]).toMatchObject({ ok: true, value: true });
  });
});