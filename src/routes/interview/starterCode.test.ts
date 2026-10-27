// The editor used to open empty with "Write your solution here", so the
// candidate's first task was guessing the harness rather than solving the
// problem. One real submission was a LeetCode-style method that printed
// nothing and would now fail every example.
import { describe, expect, it } from "vitest";
import { isUntouchedStarter, starterCodeFor } from "./starterCode";

const LANGS = ["python", "javascript", "cpp"] as const;

const AUTHORED = {
  kind: "coding" as const,
  starter_code: {
    python: "def two_sum(nums, target):\n    pass\n",
    javascript: "function twoSum(nums, target) {}\n",
  },
};
const BARE = { kind: "coding" as const };

describe("starterCodeFor", () => {
  it("prefers the starter the author wrote for this problem", () => {
    expect(starterCodeFor(AUTHORED, "python")).toContain("def two_sum");
  });

  it("falls back to a generic scaffold for a language the author skipped", () => {
    // Authored python and javascript, not cpp.
    const cpp = starterCodeFor(AUTHORED, "cpp");
    expect(cpp).toContain("int main()");
  });

  it("gives a question with no starter code a working scaffold anyway", () => {
    // Every round authored before the field existed.
    expect(starterCodeFor(BARE, "python")).toContain("def solve");
  });

  it("never returns a stub for a spoken question", () => {
    expect(starterCodeFor({ kind: "spoken" }, "python")).toBe("");
  });

  describe("every generic scaffold does its own stdin and stdout", () => {
    // Run pipes example.input to stdin and compares stdout. A stub that
    // did not read and print could not pass a single example, which would
    // make the starter code actively harmful now Submit is gated on a
    // passing run.
    it("python reads stdin and prints", () => {
      const s = starterCodeFor(BARE, "python");
      expect(s).toContain("sys.stdin");
      expect(s).toContain("print(");
    });

    it("javascript reads stdin and prints", () => {
      const s = starterCodeFor(BARE, "javascript");
      expect(s).toContain("readFileSync(0");
      expect(s).toContain("console.log");
    });

    it("cpp reads stdin", () => {
      expect(starterCodeFor(BARE, "cpp")).toContain("getline(cin");
    });
  });
});

describe("isUntouchedStarter", () => {
  it("treats an empty editor as untouched", () => {
    expect(isUntouchedStarter("", AUTHORED, LANGS)).toBe(true);
    expect(isUntouchedStarter("   \n ", AUTHORED, LANGS)).toBe(true);
  });

  it("treats the current language's own stub as untouched", () => {
    expect(isUntouchedStarter(starterCodeFor(AUTHORED, "python"), AUTHORED, LANGS))
      .toBe(true);
  });

  it("treats ANOTHER language's stub as untouched too", () => {
    // The case that matters: they opened in Python, typed nothing, then
    // switched to JavaScript. The Python stub sitting there is not work.
    expect(isUntouchedStarter(starterCodeFor(AUTHORED, "javascript"), AUTHORED, LANGS))
      .toBe(true);
  });

  it("treats anything the candidate typed as THEIRS", () => {
    const edited = starterCodeFor(AUTHORED, "python") + "\n    return [0, 1]\n";
    expect(isUntouchedStarter(edited, AUTHORED, LANGS)).toBe(false);
  });

  it("protects work that happens to be short", () => {
    expect(isUntouchedStarter("print(1)", AUTHORED, LANGS)).toBe(false);
  });

  it("ignores trailing whitespace differences", () => {
    const padded = starterCodeFor(AUTHORED, "python") + "\n\n";
    expect(isUntouchedStarter(padded, AUTHORED, LANGS)).toBe(true);
  });
});
