import { describe, expect, it } from "vitest";
import { assertWithinCallingWindow } from "./callingWindow";

const daytime = { start: "09:00", end: "18:00", tz: "Asia/Kolkata" };
const check = (iso: string, window = daytime) =>
  assertWithinCallingWindow(window, new Date(iso));

describe("immediate call window", () => {
  it("uses the configured timezone rather than UTC or the browser timezone", () => {
    expect(() => check("2026-11-17T04:00:00Z")).not.toThrow(); // 09:30 IST
    expect(() => check("2026-11-17T14:00:00Z")).toThrow("09:00 and 18:00 (Asia/Kolkata)");
  });
  it("includes the start and blocks at the end", () => {
    expect(() => check("2026-11-17T03:29:59Z")).toThrow();
    expect(() => check("2026-11-17T03:30:00Z")).not.toThrow();
    expect(() => check("2026-11-17T12:29:59Z")).not.toThrow();
    expect(() => check("2026-11-17T12:30:00Z")).toThrow();
  });
  it("supports windows that cross midnight", () => {
    const overnight = { start: "22:00", end: "06:00", tz: "UTC" };
    expect(() => check("2026-11-17T23:00:00Z", overnight)).not.toThrow();
    expect(() => check("2026-11-18T00:00:00Z", overnight)).not.toThrow();
    expect(() => check("2026-11-18T05:59:59Z", overnight)).not.toThrow();
    expect(() => check("2026-11-18T06:00:00Z", overnight)).toThrow();
    expect(() => check("2026-11-18T12:00:00Z", overnight)).toThrow();
  });
  it("accounts for daylight saving changes in the configured timezone", () => {
    const window = { start: "09:00", end: "18:00", tz: "America/New_York" };
    expect(() => check("2026-07-01T13:00:00Z", window)).not.toThrow();
    expect(() => check("2026-12-01T13:00:00Z", window)).toThrow();
    expect(() => check("2026-12-01T14:00:00Z", window)).not.toThrow();
  });
  it.each([
    undefined,
    { ...daytime, start: "25:00" },
    { ...daytime, end: "18:99" },
    { ...daytime, end: "09:00" },
    { ...daytime, tz: "invalid/timezone" },
  ])("blocks when settings cannot be verified: %j", (window) => {
    expect(() => assertWithinCallingWindow(window)).toThrow("Cannot verify the calling window");
  });
});