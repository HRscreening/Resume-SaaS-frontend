import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { createPendingRescore, readPendingRescore, markPendingRescoreReady, consumePendingRescore, discardPendingRescore } from "./pendingRescore";

beforeEach(() => {
  const store = new Map<string, string>();
  vi.stubGlobal("sessionStorage", {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value); },
    removeItem: (key: string) => { store.delete(key); },
  });
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("rescore after editing rubric", () => {
  it("snapshots the exact selection and consumes a saved action only once", () => {
    const ids = ["a", "b", "a"];
    const token = createPendingRescore("job", "user", ids);
    ids.push("c");
    expect(markPendingRescoreReady(token, "job", "user")).toBe(true);
    expect(consumePendingRescore(token, "job", "user")?.resumeIds).toEqual(["a", "b"]);
    expect(consumePendingRescore(token, "job", "user")).toBeNull();
    expect(markPendingRescoreReady(token, "job", "user")).toBe(false);
  });
  it("does not rescore when returning without saving", () => {
    const token = createPendingRescore("job", "user", ["a"]);
    expect(consumePendingRescore(token, "job", "user")).toBeNull();
    expect(readPendingRescore(token, "job", "user")).toBeNull();
  });
  it("does not rescore normal edits or canceled actions", () => {
    expect(readPendingRescore(undefined, "job", "user")).toBeNull();
    const token = createPendingRescore("job", "user", ["a"]);
    discardPendingRescore(token);
    expect(markPendingRescoreReady(token, "job", "user")).toBe(false);
    expect(consumePendingRescore(token, "job", "user")).toBeNull();
  });
  it("isolates jobs and signed-in users", () => {
    const token = createPendingRescore("job", "user", ["a"]);
    expect(markPendingRescoreReady(token, "other", "user")).toBe(false);
    expect(markPendingRescoreReady(token, "job", "other")).toBe(false);
    expect(consumePendingRescore(token, "other", "user")).toBeNull();
    expect(readPendingRescore(token, "job", "user")).not.toBeNull();
  });
  it("expires abandoned flows", () => {
    const token = createPendingRescore("job", "user", ["a"]);
    vi.spyOn(Date, "now").mockReturnValue(Date.now() + 3 * 60 * 60 * 1000);
    expect(markPendingRescoreReady(token, "job", "user")).toBe(false);
  });
  it("rejects an empty selection", () => {
    expect(() => createPendingRescore("job", "user", [])).toThrow();
  });
});
