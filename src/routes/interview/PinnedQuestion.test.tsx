import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import CodingPane from "./CodingPane";
import PinnedQuestion from "./PinnedQuestion";

describe("PinnedQuestion timer", () => {
  it("renders a red timer in the last minute", () => {
    const html = renderToStaticMarkup(<PinnedQuestion prompt="Why this role?" secondsRemaining={45} warning timerActive />);
    expect(html).toContain('role="timer"');
    expect(html).toContain("0:45");
    expect(html).toContain("bg-[#FDE2E2]");
  });

  it("renders a calm timer otherwise", () => {
    const html = renderToStaticMarkup(
      <PinnedQuestion prompt="Why this role?" secondsRemaining={120} warning={false} timerActive />,
    );
    expect(html).toContain("bg-[#F0EEE6]");
  });

  it("renders no timer once the server has stopped the question's clock", () => {
    const html = renderToStaticMarkup(
      <PinnedQuestion prompt="Why this role?" secondsRemaining={0} warning={false} timerActive={false} />,
    );
    expect(html).not.toContain('role="timer"');
    expect(html).toContain("Why this role?");
  });

  it("CodingPane imports without a module-level hook call", () => {
    expect(() => CodingPane).not.toThrow();
  });
});
