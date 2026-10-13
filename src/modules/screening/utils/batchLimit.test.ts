/**
 * The per-batch screening cap, as the user meets it. A user once selected 43
 * resumes on a plan capped at 10 and was told only "Please try again", three
 * times. These pin the two things that were missing: knowing the cap before
 * the request, and repeating the server's reason after it.
 */
import { describe, expect, it } from "vitest";

import type { PlanSpec } from "@/types";
import {
  batchLimitMessage,
  resolveMaxBatchSize,
  screeningErrorMessage,
} from "./batchLimit";

const plan = (key: PlanSpec["key"], max_batch_size: number) =>
  ({ key, max_batch_size }) as PlanSpec;

describe("resolveMaxBatchSize", () => {
  const plans = [plan("FREE", 50), plan("ENTERPRISE", -1)];

  it("returns the cap of the user's plan", () => {
    expect(resolveMaxBatchSize(plans, "FREE")).toBe(50);
  });

  it("treats the no-limit sentinel as no cap", () => {
    expect(resolveMaxBatchSize(plans, "ENTERPRISE")).toBeNull();
  });

  it("is unknown until both the catalog and the plan have loaded", () => {
    expect(resolveMaxBatchSize(undefined, "FREE")).toBeNull();
    expect(resolveMaxBatchSize(plans, undefined)).toBeNull();
  });
});

describe("batchLimitMessage", () => {
  it("allows a selection exactly at the cap", () => {
    expect(batchLimitMessage(50, 50)).toBeNull();
  });

  it("names the cap and how many to deselect when over it", () => {
    const message = batchLimitMessage(73, 50);
    expect(message).toContain("73");
    expect(message).toContain("up to 50");
    expect(message).toContain("Deselect 23");
  });

  it("never blocks when the cap is unknown, leaving the server to decide", () => {
    expect(batchLimitMessage(10_000, null)).toBeNull();
  });
});

describe("screeningErrorMessage", () => {
  const fallback = "Error screening candidates. Please try again.";

  it("repeats the server's reason for a refused request", () => {
    const refused = Object.assign(new Error("Select 50 or fewer and try again."), { status: 400 });
    expect(screeningErrorMessage(refused, fallback)).toBe("Select 50 or fewer and try again.");
  });

  it("hides the detail of a server fault", () => {
    const fault = Object.assign(new Error("Traceback ..."), { status: 500 });
    expect(screeningErrorMessage(fault, fallback)).toBe(fallback);
  });

  it("falls back for a network failure", () => {
    expect(screeningErrorMessage(new TypeError("Failed to fetch"), fallback)).toBe(fallback);
  });
});
