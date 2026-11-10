import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Markdown } from "./markdown";

const html = (text: string) => renderToStaticMarkup(<Markdown text={text} />);

// The statement a hiring manager saw unformatted on the round screen.
const STATEMENT = [
  "Find the two indices.",
  "",
  "**Input**",
  "- The first line contains an integer $N$, the number of elements.",
  "",
  "**Output**",
  "Print the two indices separated by a space.",
  "",
  "**Constraints**",
  "- $2 \\le N \\le 10^4$",
  "- $-10^{9} \\le target \\le 10^9$",
].join("\n");

describe("Markdown", () => {
  it("renders a line that is only bold as its own heading, not the start of a paragraph", () => {
    const out = html(STATEMENT);
    expect(out).toContain("<strong>Output</strong></p>");
    expect(out).toContain(">Print the two indices separated by a space.</p>");
  });

  it("renders the section bullets as a list", () => {
    expect(html(STATEMENT)).toMatch(/<ul[^>]*><li[^>]*>The first line contains an integer/);
  });

  it("renders inline math without dollar signs or TeX commands", () => {
    const out = html(STATEMENT);
    expect(out).not.toContain("$");
    expect(out).not.toContain("\\le");
    expect(out).toContain("2 ≤ N ≤ 10<sup>4</sup>");
    expect(out).toContain("-10<sup>9</sup> ≤ target ≤ 10<sup>9</sup>");
  });

  it("leaves prices alone", () => {
    expect(html("It costs $5 and $10 a month.")).toContain("It costs $5 and $10 a month.");
  });
});
