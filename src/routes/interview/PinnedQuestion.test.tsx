import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import CodingPane from "./CodingPane";
import PinnedQuestion from "./PinnedQuestion";

describe("PinnedQuestion timer", () => {
  it("renders a red timer in the last minute", () => {
    const html = renderToStaticMarkup(<PinnedQuestion prompt="Why this role?" secondsRemaining={45} warning />);
    expect(html).toContain('role="timer"');
    expect(html).toContain("0:45");
    expect(html).toContain("bg-[#FDE2E2]");
  });

  it("renders a calm timer otherwise", () => {
    const html = renderToStaticMarkup(
      <PinnedQuestion prompt="Why this role?" secondsRemaining={120} warning={false} />,
    );
    expect(html).toContain("bg-[#F0EEE6]");
  });

  it("CodingPane imports without a module-level hook call", () => {
    expect(() => CodingPane).not.toThrow();
  });
});
