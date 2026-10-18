import { describe, expect, it } from "vitest";

import { timerBadgeClasses } from "./codingPaneParts";

describe("timerBadgeClasses", () => {
  it("is calm normally, red and pulsing at one minute, red and still with reduced motion", () => {
    expect(timerBadgeClasses(false, false)).toBe("bg-[#F0EEE6] text-[#404040]");
    expect(timerBadgeClasses(true, false)).toBe("bg-[#FDE2E2] text-[#9B1C1C] animate-pulse");
    expect(timerBadgeClasses(true, true)).toBe("bg-[#FDE2E2] text-[#9B1C1C]");
  });
});
