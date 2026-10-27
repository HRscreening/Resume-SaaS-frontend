import type { InterviewLanguage, InterviewQuestion } from "@/lib/interviewApi";

// What the editor opens with, the way LeetCode and HackerRank do.
//
// It used to open empty, with a placeholder reading "Write your solution
// here." A candidate's first job was then to guess the harness: a bare
// function? a class? a script reading stdin? That guess is not what the
// question assesses, and getting it wrong means every example fails and
// (now) Submit never unlocks. One real submission was a LeetCode-style
// `def twoSum(self, nums, target)` that printed nothing.
//
// Two sources, in order:
//   1. The question's own `starter_code` for that language, written by
//      whoever authored the round. Always preferred: only the author
//      knows the function this particular problem wants.
//   2. A generic scaffold below, so questions authored before the field
//      existed still open with working I/O wiring rather than a blank box.
//
// Every scaffold reads stdin and prints, because that is what Run feeds
// and compares (runCodeLocally pipes example.input to stdin and matches
// stdout). A stub that did not do its own I/O would be a stub that cannot
// pass a single example.

const GENERIC: Record<InterviewLanguage, string> = {
  python: `import sys


def solve(lines):
    """Write your solution here.

    lines: the input, already split into a list of strings.
    Return the answer, or print it yourself and return None.
    """
    pass


def main():
    lines = sys.stdin.read().splitlines()
    result = solve(lines)
    if result is not None:
        print(result)


main()
`,
  javascript: `function solve(lines) {
  // Write your solution here.
  // lines: the input, already split into an array of strings.
  // Return the answer, or print it yourself and return undefined.
}

const lines = require("fs").readFileSync(0, "utf8").split("\\n");
const result = solve(lines);
if (result !== undefined) console.log(result);
`,
  cpp: `#include <bits/stdc++.h>
using namespace std;

// Write your solution here.
int main() {
    string line;
    while (getline(cin, line)) {
        // ...
    }
    return 0;
}
`,
};

/**
 * The starter code to put in the editor for this question and language.
 *
 * Returns the empty string only when the language is unknown, which the
 * caller treats as "leave the editor alone" rather than "clear it".
 */
export function starterCodeFor(
  question: Pick<InterviewQuestion, "kind"> & { starter_code?: Record<string, string> },
  language: InterviewLanguage,
): string {
  if (question.kind !== "coding") return "";
  const authored = question.starter_code?.[language];
  if (authored && authored.trim()) return authored;
  return GENERIC[language] ?? "";
}

/**
 * Whether the editor still holds untouched starter code.
 *
 * This is the whole reason switching language can be safe. The existing
 * rule is that changing language never discards the candidate's work --
 * their source is theirs, not a template. But a stub they have not typed
 * into is not their work, and leaving Python's stub in the box after they
 * pick JavaScript is worse than useless. Compared on trimmed text so a
 * stray newline does not count as having started.
 */
export function isUntouchedStarter(
  source: string,
  question: Pick<InterviewQuestion, "kind"> & { starter_code?: Record<string, string> },
  languages: readonly InterviewLanguage[],
): boolean {
  const current = source.trim();
  if (!current) return true;
  return languages.some((lang) => starterCodeFor(question, lang).trim() === current);
}
