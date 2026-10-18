import { describe, expect, it } from "vitest";

import { agendaSegments } from "./agenda";

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
