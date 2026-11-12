import { describe, expect, it } from "vitest";

import { agendaSegments, isInterviewFinished } from "./agenda";

describe("agendaSegments", () => {
  it("marks the first question current at the start", () => {
    expect(agendaSegments(3, 0, false)).toEqual(["current", "upcoming", "upcoming"]);
  });

  it("marks earlier questions done in the middle", () => {
    expect(agendaSegments(4, 2, false)).toEqual(["done", "done", "current", "upcoming"]);
  });

  it("marks everything done once finished", () => {
    expect(agendaSegments(3, 2, true)).toEqual(["done", "done", "done"]);
  });

  it("marks everything upcoming during the warm-up", () => {
    expect(agendaSegments(3, null, false)).toEqual(["upcoming", "upcoming", "upcoming"]);
  });
});

describe("isInterviewFinished", () => {
  const base = { total: 3, index: 2, currentId: "q3", deadlineAt: null, deadlineQuestionId: "q3" };

  it("is false on arrival while the deadline owner is stale", () => {
    expect(isInterviewFinished({ ...base, deadlineQuestionId: "q2" })).toBe(false);
  });

  it("is true when the same question's clock is closed", () => {
    expect(isInterviewFinished(base)).toBe(true);
  });

  it("is false while a deadline is live", () => {
    expect(isInterviewFinished({ ...base, deadlineAt: 123 })).toBe(false);
  });
});
