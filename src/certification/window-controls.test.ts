import * as fs from "fs";
import * as path from "path";
import * as vm from "vm";

const html = fs.readFileSync(path.resolve(__dirname, "../../references/firebolt-cert-app.html"), "utf8");

type Report = { method: string; value: unknown; isError: boolean };

function loadInvokeWindowControl(windowStub: Record<string, unknown>) {
  const start = html.indexOf("function invokeWindowControl");
  const end = html.indexOf("function setupWindowControls");
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);

  const results: Report[] = [];
  const logs: Array<{ message: string; cssClass: string }> = [];
  const context = {
    window: windowStub,
    Date,
    String,
    addResult: (method: string, value: unknown, isError: boolean) => results.push({ method, value, isError }),
    log: (message: string, cssClass: string) => logs.push({ message, cssClass }),
  };
  vm.runInNewContext(`${html.slice(start, end)}; this.invokeWindowControl = invokeWindowControl;`, context);
  return {
    invoke: (context as unknown as { invokeWindowControl: (name: string) => void }).invokeWindowControl,
    results,
    logs,
  };
}

describe("certification app window controls", () => {
  test("renders Minimize and Close buttons wired to their window functions", () => {
    expect(html).toMatch(/<button id="minimize-window-btn"[^>]*>Minimize<\/button>/);
    expect(html).toMatch(/<button id="close-window-btn"[^>]*>Close<\/button>/);
    expect(html).toMatch(/getElementById\("minimize-window-btn"\)[\s\S]*?invokeWindowControl\("minimize"\)/);
    expect(html).toMatch(/getElementById\("close-window-btn"\)[\s\S]*?invokeWindowControl\("close"\)/);
  });

  test("includes both buttons in the arrow-key navigation ring", () => {
    const ring = html.slice(html.indexOf("var allButtons = ["), html.indexOf("allButtons.forEach"));
    expect(ring).toContain("minimize-window-btn");
    expect(ring).toContain("close-window-btn");
  });

  test.each(["minimize", "close"])("invokes window.%s exactly once and reports success", (name) => {
    const calls: unknown[] = [];
    const { invoke, results, logs } = loadInvokeWindowControl({ [name]: function (this: unknown) { calls.push(this); } });

    invoke(name);

    expect(calls).toHaveLength(1);
    expect(results).toEqual([{ method: `window.${name}`, value: "ok", isError: false }]);
    expect(logs[0].cssClass).toBe("log-success");
  });

  test.each(["minimize", "close"])("reports an unavailable window.%s as a failure", (name) => {
    const { invoke, results, logs } = loadInvokeWindowControl({});

    invoke(name);

    expect(results).toEqual([{ method: `window.${name}`, value: `window.${name} is not available`, isError: true }]);
    expect(logs[0].cssClass).toBe("log-error");
  });

  test("preserves the error thrown by a window function", () => {
    const { invoke, results } = loadInvokeWindowControl({ close: () => { throw new Error("denied"); } });

    invoke("close");

    expect(results).toEqual([{ method: "window.close", value: "denied", isError: true }]);
  });
});
