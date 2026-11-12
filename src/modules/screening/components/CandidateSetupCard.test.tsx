import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CandidateSetupForm } from "./CandidateSetupCard";

const noop = () => {};

function render(over: Partial<Parameters<typeof CandidateSetupForm>[0]> = {}) {
  return renderToStaticMarkup(
    <CandidateSetupForm
      requirements={{ camera: true, screen_share: true, confirmed: false }}
      disabled={false}
      saving={false}
      onToggle={noop}
      onConfirm={noop}
      {...over}
    />,
  );
}

const checkboxes = (html: string) => html.match(/role="checkbox"[^>]*aria-checked="(true|false)"/g) ?? [];

describe("CandidateSetupForm", () => {
  it("opens with camera and screen share both required and a confirm button", () => {
    const html = render();
    expect(checkboxes(html)).toHaveLength(2);
    expect(html).not.toContain('aria-checked="false"');
    expect(html).toContain("Confirm setup");
  });

  it("reflects what the hiring manager switched off", () => {
    const html = render({ requirements: { camera: true, screen_share: false, confirmed: false } });
    expect(html).toContain('aria-checked="false"');
  });

  it("drops the confirm button once confirmed and says so", () => {
    const html = render({ requirements: { camera: true, screen_share: true, confirmed: true } });
    expect(html).not.toContain("Confirm setup");
    expect(html).toContain("Confirmed");
  });

  it("disables every control when the round cannot be written", () => {
    const html = render({ disabled: true });
    expect(html.match(/role="checkbox"[^>]*\sdisabled=""/g)).toHaveLength(2);
    expect(html).toMatch(/<button[^>]*type="submit"[^>]*disabled=""/);
  });

  it("names the saving state on the confirm button", () => {
    expect(render({ saving: true })).toContain("Saving");
  });

  it("on a frozen round shows the settings only, even if never confirmed", () => {
    // A round published before the card existed carries no confirmation.
    const html = render({ frozen: true, disabled: true });
    expect(html).not.toContain("Confirm setup");
    expect(html).not.toContain("Confirmed");
    expect(html).toContain("published");
    expect(checkboxes(html)).toHaveLength(2);
  });
});
