import { describe, expect, it } from "vitest";

import {
  INTERVIEWER_DELAYED_MS,
  INTERVIEWER_REQUEST_EVERY_MS,
  interviewerArrival,
  interviewerRequestDue,
} from "./interviewerArrival";
import { interviewerStatus } from "./InterviewerCard";

describe("interviewerArrival", () => {
  it("is present once the interviewer is in the room, however long it took", () => {
    expect(interviewerArrival(true, 0)).toBe("present");
    expect(interviewerArrival(true, 10 * 60_000)).toBe("present");
  });

  it("says the interviewer is joining, not listening, while they are absent", () => {
    expect(interviewerArrival(false, 0)).toBe("joining");
    expect(interviewerArrival(false, INTERVIEWER_DELAYED_MS - 1)).toBe("joining");
  });

  it("says plainly when the wait is longer than usual", () => {
    expect(interviewerArrival(false, INTERVIEWER_DELAYED_MS)).toBe("delayed");
  });
});

describe("interviewerRequestDue", () => {
  it("never asks while the interviewer is present", () => {
    expect(interviewerRequestDue(true, 10 * 60_000, 0)).toBe(false);
  });

  it("gives the first interviewer time to arrive before asking", () => {
    expect(interviewerRequestDue(false, INTERVIEWER_REQUEST_EVERY_MS - 1, 0)).toBe(false);
    expect(interviewerRequestDue(false, INTERVIEWER_REQUEST_EVERY_MS, 0)).toBe(true);
  });

  it("asks again at a steady pace, once per interval", () => {
    const every = INTERVIEWER_REQUEST_EVERY_MS;
    expect(interviewerRequestDue(false, every + 1, 1)).toBe(false);
    expect(interviewerRequestDue(false, 2 * every, 1)).toBe(true);
    expect(interviewerRequestDue(false, 2 * every, 2)).toBe(false);
  });
});

describe("interviewerStatus while the interviewer is missing", () => {
  it("says joining instead of listening", () => {
    expect(interviewerStatus("listening", false, false, "joining")).toBe("joining");
    expect(interviewerStatus("listening", false, true, "delayed")).toBe("joining");
  });

  it("lets a connection problem win, as it always has", () => {
    expect(interviewerStatus("listening", true, false, "joining")).toBe("reconnecting");
  });

  it("is unchanged once the interviewer is present", () => {
    expect(interviewerStatus("speaking", false, false, "present")).toBe("speaking");
    expect(interviewerStatus("listening", false, true, "present")).toBe("quiet");
  });
});
