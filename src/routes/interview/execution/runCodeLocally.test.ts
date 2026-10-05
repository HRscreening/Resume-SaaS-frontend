// A real coding question in a real round carried ZERO structured examples:
// its worked examples were written into the statement markdown instead.
// runCodeLocally looped over `examples`, so Run executed nothing at all and
// reported "0 of 0 examples passed" — indistinguishable, to the candidate
// mid-interview, from a button that does not work.
import { beforeEach, describe, expect, it, vi } from "vitest";

const run = vi.fn();
vi.mock("./pyodideManager", () => ({
  pyodideManager: {
    getStatus: () => "ready",
    whenReady: () => Promise.resolve(true),
    run: (...args: unknown[]) => run(...args),
  },
}));

const { runCodeLocally } = await import("./runCodeLocally");

beforeEach(() => {
  run.mockReset();
  run.mockResolvedValue({ stdout: "hello\n", stderr: "", crashed: false, timedOut: false });
});

describe("runCodeLocally with no examples", () => {
  it("still executes the code once", async () => {
    await runCodeLocally("python", 'print("hello")', []);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("passes empty stdin to that run", async () => {
    await runCodeLocally("python", 'print("hello")', []);
    expect(run).toHaveBeenCalledWith('print("hello")', "");
  });

  it("reports the program's output rather than a pass/fail tally", async () => {
    const res = await runCodeLocally("python", 'print("hello")', []);
    expect(res.results).toHaveLength(1);
    expect(res.results[0].stdout).toBe("hello\n");
    // Nothing to compare against, so it must not claim the code was checked.
    expect(res.results[0].status).toBe("output");
    expect(res.ran).toBe(1);
  });

  it("surfaces a crash instead of silently reporting nothing", async () => {
    run.mockResolvedValue({
      stdout: "", stderr: "NameError: x", crashed: true, timedOut: false,
    });
    const res = await runCodeLocally("python", "x", []);
    expect(res.results[0].passed).toBe(false);
    expect(res.results[0].stderr).toContain("NameError");
  });

  it("surfaces a timeout", async () => {
    run.mockResolvedValue({ stdout: "", stderr: "", crashed: false, timedOut: true });
    const res = await runCodeLocally("python", "while True: pass", []);
    expect(res.results[0].status).toBe("timeout");
  });
});

describe("runCodeLocally with examples", () => {
  it("still compares against each one", async () => {
    run.mockResolvedValue({ stdout: "3\n", stderr: "", crashed: false, timedOut: false });
    const res = await runCodeLocally("python", "print(3)", [
      { input: "1 2\n", output: "3" },
      { input: "9 9\n", output: "18" },
    ]);
    expect(res.ran).toBe(2);
    expect(res.passed).toBe(1);
    expect(res.results[1].expected).toBe("18");
  });
});
