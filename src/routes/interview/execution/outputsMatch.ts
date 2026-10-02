// A line-for-line TypeScript port of `outputs_match` in
// backend/app/modules/interview/execution.py. That function is READ-ONLY
// reference — this file exists so that whichever side eventually judges a
// given submission (this browser today, a server-side judge for C++ later)
// agrees on the same verdict for the same stdout. Do not "improve" the rule
// here without changing it there first; they must never drift apart.
//
// Python's rule, verbatim from the docstring this mirrors: "Trimmed, line by
// line, ignoring trailing whitespace." A correct solution that prints a
// trailing newline (or a trailing blank line) must not fail. A trailing
// rstrip() on the whole string absorbs that; a further rstrip() on each line
// absorbs trailing spaces and a stray \r. Leading whitespace is never
// touched, on the whole string or on a line: that is output a program chose
// to produce, not an artifact of how it was captured, and stripping it would
// let a wrongly indented answer pass.

// Python's default `str.rstrip()` (no args) strips this ASCII whitespace set
// from the right end: space, tab, newline, CR, form feed, vertical tab.
const TRAILING_WHITESPACE = /[ \t\n\r\f\v]+$/;

function rstrip(value: string): string {
  return value.replace(TRAILING_WHITESPACE, "");
}

// Python's `str.splitlines()` on a string with no trailing line terminator
// (which is always true here, since the whole string was already rstripped)
// behaves the same as splitting on \n, \r\n, or \r — except for the empty
// string, where splitlines() returns [] but a plain .split(...) would return
// [""]. That one case is special-cased below.
function splitLines(value: string): string[] {
  if (value === "") return [];
  return value.split(/\r\n|\r|\n/);
}

export function outputsMatch(expected: string | null | undefined, actual: string | null | undefined): boolean {
  const expectedLines = splitLines(rstrip(expected ?? "")).map(rstrip);
  const actualLines = splitLines(rstrip(actual ?? "")).map(rstrip);
  if (expectedLines.length !== actualLines.length) return false;
  return expectedLines.every((line, index) => line === actualLines[index]);
}
