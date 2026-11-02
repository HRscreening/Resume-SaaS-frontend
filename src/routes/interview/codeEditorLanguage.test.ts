import { EditorState } from "@codemirror/state";
import { describe, expect, it } from "vitest";

import type { InterviewLanguage } from "@/lib/interviewApi";
import { EDITOR_LANGUAGES, syntaxProblems } from "./codeEditorLanguage";
import { starterCodeFor } from "./starterCode";

function problemsIn(language: InterviewLanguage, doc: string) {
  return syntaxProblems(EditorState.create({ doc, extensions: [EDITOR_LANGUAGES[language].support()] }));
}

const PY_TWO_SUM = `import sys


def two_sum(nums, target):
    """Return the indices of the two numbers that add up to target."""
    seen = {}
    for i, n in enumerate(nums):
        if (j := seen.get(target - n)) is not None:
            return j, i
        seen[n] = i
    match nums:
        case [only]:
            return None
        case _:
            return None


def main():
    data = sys.stdin.read().split()
    nums = [int(x) for x in data[:-1]]
    i, j = two_sum(nums, int(data[-1]))
    print(f"{i} {j}", end="\\n")


main()
`;

const JS_TWO_SUM = `function twoSum(nums, target) {
  const seen = new Map();
  for (const [i, n] of nums.entries()) {
    if (seen.has(target - n)) return [seen.get(target - n), i];
    seen.set(n, i);
  }
  return nums?.length ?? null;
}

const data = require("fs").readFileSync(0, "utf8").split(/\\s+/).filter(Boolean);
const [i, j] = twoSum(data.slice(0, -1).map(Number), Number(data[data.length - 1]));
console.log(\`\${i} \${j}\`);
`;

describe("syntaxProblems", () => {
  // A false underline on working code would cost a candidate real time
  // hunting for a mistake that is not there.
  it("finds nothing wrong with valid Python, including newer syntax", () => {
    expect(problemsIn("python", PY_TWO_SUM)).toEqual([]);
  });

  it("finds nothing wrong with valid JavaScript", () => {
    expect(problemsIn("javascript", JS_TWO_SUM)).toEqual([]);
  });

  it("finds nothing wrong with the scaffold a candidate starts from", () => {
    for (const language of ["python", "javascript"] as const) {
      const scaffold = starterCodeFor({ kind: "coding" }, language);
      expect(problemsIn(language, scaffold)).toEqual([]);
    }
  });

  it("marks an unclosed bracket in Python", () => {
    const problems = problemsIn("python", "def two_sum(nums, target:\n    return 1\n");
    expect(problems.length).toBeGreaterThan(0);
  });

  it("marks a missing brace in JavaScript", () => {
    expect(problemsIn("javascript", "function f() {\n  return 1;\n").length).toBeGreaterThan(0);
  });

  it("gives every problem a range wide enough to draw", () => {
    for (const problem of problemsIn("python", "x = (1 +\n")) {
      expect(problem.to).toBeGreaterThan(problem.from);
    }
  });
});
