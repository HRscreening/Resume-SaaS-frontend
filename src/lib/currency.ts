// Which currency this visitor is billed in.
//
// We bill in two currencies: INR in India, USD everywhere else. Prices are
// denominated in USD; the rupee amount is the USD price converted at the
// live rate, which the backend computes (GET /api/billing/quote). Nothing
// here does money arithmetic — it only answers "is this browser in India",
// because the server can't tell: Railway injects no geo headers.
//
// This is a hint, not an instruction. The backend treats it as one: it can
// select INR and nothing else. Historically this file returned any of ~50
// currencies and the backend charged that number as rupees, so a $25 plan
// billed a US card ₹25.

export type BillingCurrency = "USD" | "INR";

// The IANA zones that mean India. "Calcutta" is the deprecated alias, still
// reported by older systems.
const INDIA_TIMEZONES = new Set(["Asia/Kolkata", "Asia/Calcutta"]);

const INDIA_REGION = "IN";

function regionFromTimezone(): string | undefined {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!tz) return undefined;
    return INDIA_TIMEZONES.has(tz) ? INDIA_REGION : undefined;
  } catch {
    return undefined;
  }
}

function regionFromLocale(): string | undefined {
  try {
    const locale = new Intl.NumberFormat().resolvedOptions().locale;
    try {
      return new Intl.Locale(locale).maximize().region;
    } catch {
      const parts = locale.split("-");
      return parts[parts.length - 1]?.toUpperCase();
    }
  } catch {
    return undefined;
  }
}

/**
 * The currency to ask the backend to price in. Timezone first — it tracks
 * the OS clock, which tracks where the machine actually is — then the
 * locale's region as a fallback.
 */
export function detectBillingCurrency(): BillingCurrency {
  if (regionFromTimezone() === INDIA_REGION) return "INR";
  if (regionFromLocale() === INDIA_REGION) return "INR";
  return "USD";
}

/** Format a major-unit amount in the currency it was quoted in. */
export function formatMoney(amount: number, currency: BillingCurrency | string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      // Rupee amounts are always whole (the backend rounds up to the rupee);
      // dollar amounts want cents when they have them.
      maximumFractionDigits: currency === "INR" ? 0 : 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}
