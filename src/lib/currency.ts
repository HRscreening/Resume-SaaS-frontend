// Detect the user's currency client-side. The backend (Railway) doesn't
// receive geo headers, so we infer it here.
//
// Strategy: IANA timezone first (reflects the OS clock setting, which tracks
// physical location), then fall back to the browser locale's region.

const REGION_TO_CURRENCY: Record<string, string> = {
  IN: "INR",
  US: "USD",
  CA: "CAD",
  GB: "GBP",
  AU: "AUD",
  NZ: "NZD",
  JP: "JPY",
  CN: "CNY",
  HK: "HKD",
  SG: "SGD",
  MY: "MYR",
  ID: "IDR",
  TH: "THB",
  PH: "PHP",
  VN: "VND",
  KR: "KRW",
  TW: "TWD",
  AE: "AED",
  SA: "SAR",
  IL: "ILS",
  TR: "TRY",
  RU: "RUB",
  UA: "UAH",
  ZA: "ZAR",
  NG: "NGN",
  KE: "KES",
  EG: "EGP",
  BR: "BRL",
  MX: "MXN",
  AR: "ARS",
  CL: "CLP",
  CO: "COP",
  PE: "PEN",
  CH: "CHF",
  NO: "NOK",
  SE: "SEK",
  DK: "DKK",
  PL: "PLN",
  CZ: "CZK",
  HU: "HUF",
  RO: "RON",
  BG: "BGN",
  PK: "PKR",
  BD: "BDT",
  LK: "LKR",
  NP: "NPR",
};

const EURO_REGIONS = new Set([
  "AT", "BE", "CY", "DE", "EE", "ES", "FI", "FR", "GR", "HR", "IE", "IT",
  "LT", "LU", "LV", "MT", "NL", "PT", "SI", "SK",
]);

// IANA timezone → ISO 3166-1 alpha-2 region. Covers the cities/zones most
// users actually hit. Unknown zones fall through to locale-based detection.
const TIMEZONE_TO_REGION: Record<string, string> = {
  // South Asia
  "Asia/Kolkata": "IN",
  "Asia/Calcutta": "IN",
  "Asia/Karachi": "PK",
  "Asia/Dhaka": "BD",
  "Asia/Colombo": "LK",
  "Asia/Kathmandu": "NP",
  // East / Southeast Asia
  "Asia/Tokyo": "JP",
  "Asia/Shanghai": "CN",
  "Asia/Hong_Kong": "HK",
  "Asia/Singapore": "SG",
  "Asia/Kuala_Lumpur": "MY",
  "Asia/Jakarta": "ID",
  "Asia/Bangkok": "TH",
  "Asia/Manila": "PH",
  "Asia/Ho_Chi_Minh": "VN",
  "Asia/Seoul": "KR",
  "Asia/Taipei": "TW",
  // Middle East
  "Asia/Dubai": "AE",
  "Asia/Riyadh": "SA",
  "Asia/Jerusalem": "IL",
  "Asia/Tel_Aviv": "IL",
  "Europe/Istanbul": "TR",
  // Europe (non-euro)
  "Europe/London": "GB",
  "Europe/Zurich": "CH",
  "Europe/Oslo": "NO",
  "Europe/Stockholm": "SE",
  "Europe/Copenhagen": "DK",
  "Europe/Warsaw": "PL",
  "Europe/Prague": "CZ",
  "Europe/Budapest": "HU",
  "Europe/Bucharest": "RO",
  "Europe/Sofia": "BG",
  "Europe/Moscow": "RU",
  "Europe/Kiev": "UA",
  "Europe/Kyiv": "UA",
  // Europe (eurozone — sample; region map handles EUR)
  "Europe/Berlin": "DE",
  "Europe/Paris": "FR",
  "Europe/Madrid": "ES",
  "Europe/Rome": "IT",
  "Europe/Amsterdam": "NL",
  "Europe/Brussels": "BE",
  "Europe/Vienna": "AT",
  "Europe/Dublin": "IE",
  "Europe/Helsinki": "FI",
  "Europe/Lisbon": "PT",
  "Europe/Athens": "GR",
  // Africa
  "Africa/Johannesburg": "ZA",
  "Africa/Lagos": "NG",
  "Africa/Nairobi": "KE",
  "Africa/Cairo": "EG",
  // Americas
  "America/New_York": "US",
  "America/Chicago": "US",
  "America/Denver": "US",
  "America/Los_Angeles": "US",
  "America/Phoenix": "US",
  "America/Anchorage": "US",
  "Pacific/Honolulu": "US",
  "America/Toronto": "CA",
  "America/Vancouver": "CA",
  "America/Edmonton": "CA",
  "America/Halifax": "CA",
  "America/Sao_Paulo": "BR",
  "America/Mexico_City": "MX",
  "America/Argentina/Buenos_Aires": "AR",
  "America/Santiago": "CL",
  "America/Bogota": "CO",
  "America/Lima": "PE",
  // Oceania
  "Australia/Sydney": "AU",
  "Australia/Melbourne": "AU",
  "Australia/Brisbane": "AU",
  "Australia/Perth": "AU",
  "Australia/Adelaide": "AU",
  "Pacific/Auckland": "NZ",
};

function regionToCurrency(region: string): string {
  if (EURO_REGIONS.has(region)) return "EUR";
  return REGION_TO_CURRENCY[region] ?? "USD";
}

function regionFromTimezone(): string | undefined {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!tz) return undefined;
    return TIMEZONE_TO_REGION[tz];
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

export function detectCurrency(): string {
  const region = regionFromTimezone() ?? regionFromLocale();
  if (!region) return "USD";
  return regionToCurrency(region);
}
