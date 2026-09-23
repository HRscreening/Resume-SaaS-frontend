/**
 * The browser tells the backend which currency to price in. It may say
 * INR (India) or USD (everywhere else) and nothing else — this file used
 * to return ~50 currencies, and the backend charged whatever number came
 * back as rupees, so a $25 plan billed a US card ₹25.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import { detectBillingCurrency, formatMoney } from "./currency";

function withEnvironment({ timeZone, locale }: { timeZone?: string; locale?: string }) {
  vi.spyOn(Intl, "DateTimeFormat").mockReturnValue({
    resolvedOptions: () => ({ timeZone }),
  } as unknown as Intl.DateTimeFormat);
  vi.spyOn(Intl, "NumberFormat").mockReturnValue({
    resolvedOptions: () => ({ locale }),
  } as unknown as Intl.NumberFormat);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("detectBillingCurrency", () => {
  it("bills India in rupees from the timezone", () => {
    withEnvironment({ timeZone: "Asia/Kolkata", locale: "en-US" });
    expect(detectBillingCurrency()).toBe("INR");
  });

  it("accepts the deprecated Asia/Calcutta alias", () => {
    withEnvironment({ timeZone: "Asia/Calcutta", locale: "en-US" });
    expect(detectBillingCurrency()).toBe("INR");
  });

  it("falls back to the locale region when the timezone is unknown", () => {
    withEnvironment({ timeZone: "Etc/Unknown", locale: "hi-IN" });
    expect(detectBillingCurrency()).toBe("INR");
  });

  it("bills the US in dollars", () => {
    withEnvironment({ timeZone: "America/New_York", locale: "en-US" });
    expect(detectBillingCurrency()).toBe("USD");
  });

  it("bills every other country in dollars, not its own currency", () => {
    for (const tz of ["Europe/London", "Asia/Tokyo", "Australia/Sydney", "Europe/Berlin"]) {
      withEnvironment({ timeZone: tz, locale: "en-GB" });
      expect(detectBillingCurrency()).toBe("USD");
      vi.restoreAllMocks();
    }
  });

  it("defaults to dollars when the browser tells us nothing", () => {
    withEnvironment({ timeZone: undefined, locale: undefined });
    expect(detectBillingCurrency()).toBe("USD");
  });

  it("defaults to dollars when Intl throws", () => {
    vi.spyOn(Intl, "DateTimeFormat").mockImplementation(() => {
      throw new Error("no Intl here");
    });
    vi.spyOn(Intl, "NumberFormat").mockImplementation(() => {
      throw new Error("no Intl here");
    });
    expect(detectBillingCurrency()).toBe("USD");
  });
});

describe("formatMoney", () => {
  it("shows rupees as whole numbers", () => {
    expect(formatMoney(2213, "INR")).not.toContain(".");
  });

  it("keeps cents on dollar amounts", () => {
    expect(formatMoney(25, "USD")).toContain("25");
  });

  it("does not throw on an unexpected currency code", () => {
    expect(() => formatMoney(10, "NOTACURRENCY")).not.toThrow();
  });
});
