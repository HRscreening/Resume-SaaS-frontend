// The editor opens on the stub the server generated from the question's
// signature. It is never written here, so it cannot disagree with the
// driver that calls it.
import { describe, expect, it } from "vitest";
import { isUntouchedStarter, starterCodeFor } from "./starterCode";

const QUESTION = {
  kind: "coding" as const,
  starter_code: {
    python: "def two_sum(nums: List[int], target: int) -> List[int]:\n    pass\n",
    javascript: "function twoSum(nums, target) {\n}\n",
  },
};

describe("starterCodeFor", () => {
  it("is the server's stub for that language", () => {
    expect(starterCodeFor(QUESTION, "python")).toContain("def two_sum");
    expect(starterCodeFor(QUESTION, "javascript")).toContain("function twoSum");
  });

  it("is empty for a question published before the harness", () => {
    expect(starterCodeFor({ kind: "coding" }, "python")).toBe("");
  });

  it("is never a stub for a spoken question", () => {
    expect(starterCodeFor({ kind: "spoken" }, "python")).toBe("");
  });
});

describe("isUntouchedStarter", () => {
  it("treats an empty editor as untouched", () => {
    expect(isUntouchedStarter("", QUESTION)).toBe(true);
    expect(isUntouchedStarter("   \n ", QUESTION)).toBe(true);
  });

  it("treats the current language's own stub as untouched", () => {
    expect(isUntouchedStarter(starterCodeFor(QUESTION, "python"), QUESTION)).toBe(true);
  });

  it("treats ANOTHER language's stub as untouched too", () => {
    // The case that matters: they opened in Python, typed nothing, then
    // switched to JavaScript. The Python stub sitting there is not work.
    expect(isUntouchedStarter(starterCodeFor(QUESTION, "javascript"), QUESTION)).toBe(true);
  });

  it("treats anything the candidate typed as THEIRS", () => {
    const edited = starterCodeFor(QUESTION, "python") + "\n    return [0, 1]\n";
    expect(isUntouchedStarter(edited, QUESTION)).toBe(false);
    expect(isUntouchedStarter("print(1)", QUESTION)).toBe(false);
  });

  it("ignores trailing whitespace differences", () => {
    expect(isUntouchedStarter(starterCodeFor(QUESTION, "python") + "\n\n", QUESTION)).toBe(true);
  });
});
