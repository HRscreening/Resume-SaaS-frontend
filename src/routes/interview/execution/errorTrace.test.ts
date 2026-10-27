import { describe, expect, it } from "vitest";

import { cleanJsStack, cleanPythonTraceback, summarizeError } from "./errorTrace";

const PY_RUNTIME = [
  "Traceback (most recent call last):",
  '  File "<exec>", line 44, in <module>',
  '  File "<string>", line 20, in <module>',
  '  File "<string>", line 16, in main',
  '  File "<string>", line 5, in two_sum',
  "NameError: name 'seen' is not defined",
  "",
].join("\n");

const PY_SYNTAX = [
  "Traceback (most recent call last):",
  '  File "<exec>", line 44, in <module>',
  '  File "<string>", line 3',
  "    def two_sum(nums, target",
  "               ^",
  "SyntaxError: '(' was never closed",
  "",
].join("\n");

describe("cleanPythonTraceback", () => {
  it("keeps only the candidate's own frames, numbered against their code", () => {
    expect(cleanPythonTraceback(PY_RUNTIME)).toBe(
      [
        "Line 20, at the top level",
        "Line 16, in main",
        "Line 5, in two_sum",
        "NameError: name 'seen' is not defined",
      ].join("\n"),
    );
  });

  it("keeps the offending code and caret of a syntax error", () => {
    expect(cleanPythonTraceback(PY_SYNTAX)).toBe(
      ["Line 3", "    def two_sum(nums, target", "               ^", "SyntaxError: '(' was never closed"].join("\n"),
    );
  });

  it("keeps what the program itself wrote to stderr before crashing", () => {
    expect(cleanPythonTraceback(`debug: got here\n${PY_RUNTIME}`).startsWith("debug: got here\nLine 20")).toBe(true);
  });

  it("leaves stderr that is not a traceback alone", () => {
    expect(cleanPythonTraceback("just a warning\n")).toBe("just a warning");
  });
});

describe("cleanJsStack", () => {
  it("renumbers a Chrome stack against the candidate's code, deepest frame last", () => {
    const stack = [
      "TypeError: seen.has is not a function",
      "    at twoSum (candidate-solution.js:7:14)",
      "    at eval (candidate-solution.js:14:16)",
      "    at runOnce (http://localhost:3000/src/javascript.worker.ts:120:5)",
    ].join("\n");
    expect(cleanJsStack("TypeError", "seen.has is not a function", stack, 2)).toBe(
      ["Line 12, at the top level", "Line 5, in twoSum", "TypeError: seen.has is not a function"].join("\n"),
    );
  });

  it("reads a Firefox stack, which has no message line of its own", () => {
    const stack = ["twoSum@candidate-solution.js:5:14", "anonymous@candidate-solution.js:12:16", "runOnce@http://x/w.ts:1:1"].join("\n");
    expect(cleanJsStack("ReferenceError", "x is not defined", stack, 0)).toBe(
      ["Line 12, at the top level", "Line 5, in twoSum", "ReferenceError: x is not defined"].join("\n"),
    );
  });

  it("is just the message when no frame is the candidate's, as for a syntax error", () => {
    expect(cleanJsStack("SyntaxError", "Unexpected token '}'", "SyntaxError: Unexpected token '}'\n    at new Function (<anonymous>)", 2)).toBe(
      "SyntaxError: Unexpected token '}'",
    );
  });
});

describe("summarizeError", () => {
  it("names the error and the deepest line of the candidate's code", () => {
    expect(summarizeError(cleanPythonTraceback(PY_RUNTIME))).toEqual({
      headline: "NameError: name 'seen' is not defined",
      line: 5,
    });
  });

  it("finds the line of a syntax error", () => {
    expect(summarizeError(cleanPythonTraceback(PY_SYNTAX))).toEqual({
      headline: "SyntaxError: '(' was never closed",
      line: 3,
    });
  });

  it("has no line when the error carries none", () => {
    expect(summarizeError("Timed out: this took too long to run.")).toEqual({
      headline: "Timed out: this took too long to run.",
      line: null,
    });
  });

  it("is null when nothing was written", () => {
    expect(summarizeError("  \n")).toBeNull();
  });
});
