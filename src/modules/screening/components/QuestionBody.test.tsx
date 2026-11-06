import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { QuestionBody } from "./RoundView";
import type { Question } from "@/types";

const coding = {
  id: "q1", kind: "coding", competency_ref: "Python", weight: 5, allocated_minutes: 18,
  expected_answer: "", grading_notes: "", title: "Two Sum",
  statement_md: "Find them.\n\n**Input**\n- $N$ integers\n\n**Constraints**\n- $2 \\le N \\le 10^4$",
  examples: [{ input: "4\n2 7 11 15\n9", output: "0 1", note: "" }],
  starter_code: {},
} as unknown as Question;

describe("QuestionBody on the round screen", () => {
  it("formats the statement the way the candidate sees it", () => {
    const html = renderToStaticMarkup(<QuestionBody question={coding} />);
    expect(html).toContain("<strong>Input</strong>");
    expect(html).toContain("10<sup>4</sup>");
    expect(html).not.toContain("**");
    expect(html).not.toContain("$");
  });

  it("keeps an example's line breaks, since each line is part of the input", () => {
    const html = renderToStaticMarkup(<QuestionBody question={coding} />);
    expect(html).toMatch(/whitespace-pre-wrap[^>]*>4\n2 7 11 15\n9</);
  });
});
