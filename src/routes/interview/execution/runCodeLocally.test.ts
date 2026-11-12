// Run executes the candidate's code with the server's driver appended, so
// the browser calls their function exactly as the sandbox will at Submit,
// and judges the returned value rather than printed text.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RESULT_MARKER } from "./harness";

const run = vi.fn();
vi.mock("./pyodideManager", () => ({
  pyodideManager: {
    getStatus: () => "ready",
    whenReady: () => Promise.resolve(true),
    run: (...args: unknown[]) => run(...args),
  },
}));

const { runCodeLocally, runWithInput } = await import("./runCodeLocally");

const DRIVER = "__hiresort_main()";
const SOURCE = "def two_sum(nums, target):\n    return [0, 1]\n";
const HARNESSED = {
  examples: [
    { input: "[2,7,11,15]\n9", output: "[0,1]" },
    { input: "[3,2,4]\n6", output: "[1,2]" },
  ],
  harness: { python: DRIVER, javascript: "main()" },
};
const LEGACY = { examples: [{ input: "1 2\n", output: "3" }, { input: "9 9\n", output: "18" }] };

const returned = (value: string, printed = "") => ({
  stdout: `${printed}${RESULT_MARKER}${value}\n`, stderr: "", crashed: false, timedOut: false,
});

beforeEach(() => {
  run.mockReset();
  run.mockResolvedValue(returned("[0,1]"));
});

describe("runCodeLocally on a harness question", () => {
  it("runs the candidate's code with the driver appended, once per example", async () => {
    await runCodeLocally("python", SOURCE, HARNESSED);
    expect(run).toHaveBeenCalledTimes(2);
    expect(run).toHaveBeenNthCalledWith(1, `${SOURCE.trimEnd()}\n${DRIVER}`, "[2,7,11,15]\n9");
  });

  it("judges the returned value and reports what was printed separately", async () => {
    run.mockResolvedValueOnce(returned("[0, 1]", "looking\n")).mockResolvedValueOnce(returned("[0,1]"));
    const res = await runCodeLocally("python", SOURCE, HARNESSED);
    expect(res.passed).toBe(1);
    expect(res.results[0]).toMatchObject({ passed: true, stdout: "looking", actual: "[0, 1]" });
    expect(res.results[1]).toMatchObject({ passed: false, expected: "[1,2]", actual: "[0,1]" });
  });

  it("fails an example whose function printed the answer instead of returning it", async () => {
    run.mockResolvedValue({ stdout: "[0,1]\n", stderr: "", crashed: false, timedOut: false });
    const res = await runCodeLocally("python", SOURCE, HARNESSED);
    expect(res.passed).toBe(0);
    expect(res.results[0].actual).toBe("");
  });

  it("surfaces a crash and a timeout", async () => {
    run
      .mockResolvedValueOnce({ stdout: "", stderr: "NameError: x", crashed: true, timedOut: false })
      .mockResolvedValueOnce({ stdout: "", stderr: "", crashed: false, timedOut: true });
    const res = await runCodeLocally("python", "x", HARNESSED);
    expect(res.results[0]).toMatchObject({ status: "runtime_error", passed: false });
    expect(res.results[0].stderr).toContain("NameError");
    expect(res.results[1].status).toBe("timeout");
  });
});

describe("runCodeLocally on a question published before the harness", () => {
  it("runs the source as is and compares the output text", async () => {
    run.mockResolvedValue({ stdout: "3\n", stderr: "", crashed: false, timedOut: false });
    const res = await runCodeLocally("python", "print(3)", LEGACY);
    expect(run).toHaveBeenNthCalledWith(1, "print(3)", "1 2\n");
    expect(res.ran).toBe(2);
    expect(res.passed).toBe(1);
    expect(res.results[1]).toMatchObject({ expected: "18", actual: "3\n" });
  });
});

describe("runCodeLocally with no examples", () => {
  // A real coding question in a real round carried ZERO structured
  // examples. Looping over nothing reported "0 of 0 examples passed",
  // indistinguishable mid-interview from a button that does not work.
  it("still executes the code once and reports the result rather than a tally", async () => {
    const res = await runCodeLocally("python", SOURCE, { examples: [], harness: { python: DRIVER } });
    expect(run).toHaveBeenCalledWith(`${SOURCE.trimEnd()}\n${DRIVER}`, "");
    expect(res.results[0]).toMatchObject({ status: "output", actual: "[0,1]", stdout: "" });
    expect(res.ran).toBe(1);
  });
});

describe("runWithInput", () => {
  it("calls the function with the candidate's own arguments and shows what came back", async () => {
    run.mockResolvedValue(returned("[1,2]", "debug\n"));
    const res = await runWithInput("python", SOURCE, HARNESSED, "[3,3]\n6");
    expect(run).toHaveBeenCalledWith(`${SOURCE.trimEnd()}\n${DRIVER}`, "[3,3]\n6");
    // Nothing to compare against: a result, never a pass or fail.
    expect(res.results[0]).toMatchObject({ status: "output", actual: "[1,2]", stdout: "debug" });
  });
});
