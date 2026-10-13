/**
 * The limits a user meets when pressing Screen. A user once selected 43
 * resumes on a plan capped at 10 per batch and was told only "Please try
 * again", three times. These pin what was missing: knowing every limit
 * before the request, saying which one applies and what number to aim for,
 * and repeating the server's reason if it refuses anyway.
 */
import { describe, expect, it } from "vitest";

import type { PlanSpec } from "@/types";
import {
  resolveMaxBatchSize,
  screenBlock,
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

describe("screenBlock", () => {
  const free = { maxBatchSize: 50, quotaRemaining: 50 };

  it("allows a selection that fits both the batch cap and the quota", () => {
    expect(screenBlock(44, free)).toBeNull();
    expect(screenBlock(50, free)).toBeNull();
  });

  it("names the batch cap and how many to deselect when over it", () => {
    const block = screenBlock(73, { maxBatchSize: 50, quotaRemaining: 900 });
    expect(block?.reason).toBe("batch_size");
    expect(block?.allowed).toBe(50);
    expect(block?.message).toContain("up to 50");
    expect(block?.message).toContain("Deselect 23");
    expect(block?.hint).toBe("Max 50 per batch");
  });

  it("names the remaining quota when that is the tighter limit", () => {
    // 44 of Free's 50 analyses already used: the batch cap of 50 is not the problem.
    const block = screenBlock(43, { maxBatchSize: 50, quotaRemaining: 6 });
    expect(block?.reason).toBe("quota");
    expect(block?.allowed).toBe(6);
    expect(block?.message).toContain("6 analyses left");
    expect(block?.message).toContain("Deselect 37");
    expect(block?.hint).toBe("6 analyses left");
  });

  it("says the quota is spent instead of asking to deselect everything", () => {
    const block = screenBlock(3, { maxBatchSize: 50, quotaRemaining: 0 });
    expect(block?.reason).toBe("quota");
    expect(block?.message).toContain("no resume analyses left");
    expect(block?.message).not.toContain("Deselect");
  });

  it("never blocks on a limit it does not know, leaving the server to decide", () => {
    expect(screenBlock(10_000, { maxBatchSize: null, quotaRemaining: null })).toBeNull();
    expect(screenBlock(60, { maxBatchSize: null, quotaRemaining: 100 })).toBeNull();
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
