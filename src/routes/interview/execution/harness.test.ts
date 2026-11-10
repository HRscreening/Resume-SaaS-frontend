// The browser half of the function harness must agree with the backend's
// (app/modules/interview/harness.py): same marker, same value comparison,
// same way of composing the program. Run here and Submit there judge the
// same code the same way.
import { describe, expect, it } from "vitest";
import {
  answerMatches, composeProgram, formatCall, outputsMatch, RESULT_MARKER, splitResult, valuesMatch,
} from "./harness";

const TWO_SUM = {
  name: "two_sum",
  params: [{ name: "nums", type: "int[]" }, { name: "target", type: "int" }],
  returns: "int[]",
};

describe("composeProgram", () => {
  it("appends the driver after the candidate's code", () => {
    expect(composeProgram("def f():\n    pass\n\n\n", "DRIVER")).toBe("def f():\n    pass\nDRIVER");
  });

  it("runs a question without a driver as the plain program it is", () => {
    expect(composeProgram("print(1)", undefined)).toBe("print(1)");
  });
});

describe("splitResult", () => {
  it("separates the returned value from what was printed", () => {
    expect(splitResult(`looking\n${RESULT_MARKER}[0,1]\n`)).toEqual({ result: "[0,1]", printed: "looking" });
  });

  it("reports no result when the driver never wrote one", () => {
    expect(splitResult("0 1\n")).toEqual({ result: null, printed: "0 1" });
  });
});

describe("valuesMatch", () => {
  it("compares values, not spelling", () => {
    expect(valuesMatch("[0,1]", "[0, 1]")).toBe(true);
    expect(valuesMatch('{"a":1,"b":2}', '{"b": 2, "a": 1}')).toBe(true);
  });

  it("allows floating point noise", () => {
    expect(valuesMatch("0.3", "0.30000000000000004")).toBe(true);
    expect(valuesMatch("2", "2.0")).toBe(true);
    expect(valuesMatch("2", "3")).toBe(false);
  });

  it("keeps booleans apart from numbers and order within lists", () => {
    expect(valuesMatch("1", "true")).toBe(false);
    expect(valuesMatch("[0,1]", "[1,0]")).toBe(false);
    expect(valuesMatch('"ab"', '"ab "')).toBe(false);
  });

  it("never matches a missing or unparsable result", () => {
    expect(valuesMatch("[0,1]", null)).toBe(false);
    expect(valuesMatch("[0,1]", "not json")).toBe(false);
  });
});

describe("answerMatches", () => {
  it("judges a harness question on the returned value, not on printed text", () => {
    expect(answerMatches(true, "[0,1]", `noise\n${RESULT_MARKER}[0, 1]\n`)).toBe(true);
    expect(answerMatches(true, "[0,1]", "[0,1]\n")).toBe(false);
  });

  it("judges a legacy question on its output text", () => {
    expect(answerMatches(false, "0 1", "0 1\n")).toBe(true);
  });
});

describe("outputsMatch", () => {
  it("ignores a trailing newline and trailing spaces but not leading ones", () => {
    expect(outputsMatch("3", "3\n")).toBe(true);
    expect(outputsMatch("3 4\n5 6", "3 4   \n5 6   ")).toBe(true);
    expect(outputsMatch("  3", "3")).toBe(false);
  });

  it("compares line by line", () => {
    expect(outputsMatch("1\n2\n3", "1\n2\n3\n")).toBe(true);
    expect(outputsMatch("1\n2\n3", "1\n2\n4")).toBe(false);
    expect(outputsMatch("ok", "")).toBe(false);
    expect(outputsMatch("", "")).toBe(true);
  });
});

describe("formatCall", () => {
  it("names each argument", () => {
    expect(formatCall(TWO_SUM, "[2,7,11,15]\n9")).toBe("nums = [2,7,11,15], target = 9");
  });

  it("falls back to the raw values when they do not line up with the parameters", () => {
    expect(formatCall(TWO_SUM, "[2,7]")).toBe("[2,7]");
  });
});
