/**
 * Country dial codes for phone-number entry.
 *
 * Data + search live here (pure, no React) so the matching rules can be reasoned
 * about and tested independently of the picker that renders them.
 */

export interface Country {
  /** ISO 3166-1 alpha-2, also used to derive the flag emoji. */
  iso: string;
  name: string;
  /** E.164 calling code WITHOUT the plus, e.g. "91". */
  dial: string;
}

/** Pinned above the alphabetical list: the product's primary market, and the
 *  code the backend defaults to. Scrolling to it every time is friction on the
 *  one option most recruiters here actually want. */
export const PRIMARY_ISO = "IN";

export const COUNTRIES: readonly Country[] = [
  { iso: "AF", name: "Afghanistan", dial: "93" },
  { iso: "AL", name: "Albania", dial: "355" },
  { iso: "DZ", name: "Algeria", dial: "213" },
  { iso: "AR", name: "Argentina", dial: "54" },
  { iso: "AM", name: "Armenia", dial: "374" },
  { iso: "AU", name: "Australia", dial: "61" },
  { iso: "AT", name: "Austria", dial: "43" },
  { iso: "AZ", name: "Azerbaijan", dial: "994" },
  { iso: "BH", name: "Bahrain", dial: "973" },
  { iso: "BD", name: "Bangladesh", dial: "880" },
  { iso: "BY", name: "Belarus", dial: "375" },
  { iso: "BE", name: "Belgium", dial: "32" },
  { iso: "BO", name: "Bolivia", dial: "591" },
  { iso: "BA", name: "Bosnia and Herzegovina", dial: "387" },
  { iso: "BW", name: "Botswana", dial: "267" },
  { iso: "BR", name: "Brazil", dial: "55" },
  { iso: "BG", name: "Bulgaria", dial: "359" },
  { iso: "KH", name: "Cambodia", dial: "855" },
  { iso: "CM", name: "Cameroon", dial: "237" },
  { iso: "CA", name: "Canada", dial: "1" },
  { iso: "CL", name: "Chile", dial: "56" },
  { iso: "CN", name: "China", dial: "86" },
  { iso: "CO", name: "Colombia", dial: "57" },
  { iso: "CR", name: "Costa Rica", dial: "506" },
  { iso: "HR", name: "Croatia", dial: "385" },
  { iso: "CY", name: "Cyprus", dial: "357" },
  { iso: "CZ", name: "Czechia", dial: "420" },
  { iso: "DK", name: "Denmark", dial: "45" },
  { iso: "DO", name: "Dominican Republic", dial: "1809" },
  { iso: "EC", name: "Ecuador", dial: "593" },
  { iso: "EG", name: "Egypt", dial: "20" },
  { iso: "SV", name: "El Salvador", dial: "503" },
  { iso: "EE", name: "Estonia", dial: "372" },
  { iso: "ET", name: "Ethiopia", dial: "251" },
  { iso: "FI", name: "Finland", dial: "358" },
  { iso: "FR", name: "France", dial: "33" },
  { iso: "GE", name: "Georgia", dial: "995" },
  { iso: "DE", name: "Germany", dial: "49" },
  { iso: "GH", name: "Ghana", dial: "233" },
  { iso: "GR", name: "Greece", dial: "30" },
  { iso: "GT", name: "Guatemala", dial: "502" },
  { iso: "HK", name: "Hong Kong", dial: "852" },
  { iso: "HU", name: "Hungary", dial: "36" },
  { iso: "IS", name: "Iceland", dial: "354" },
  { iso: "IN", name: "India", dial: "91" },
  { iso: "ID", name: "Indonesia", dial: "62" },
  { iso: "IR", name: "Iran", dial: "98" },
  { iso: "IQ", name: "Iraq", dial: "964" },
  { iso: "IE", name: "Ireland", dial: "353" },
  { iso: "IL", name: "Israel", dial: "972" },
  { iso: "IT", name: "Italy", dial: "39" },
  { iso: "JM", name: "Jamaica", dial: "1876" },
  { iso: "JP", name: "Japan", dial: "81" },
  { iso: "JO", name: "Jordan", dial: "962" },
  { iso: "KZ", name: "Kazakhstan", dial: "7" },
  { iso: "KE", name: "Kenya", dial: "254" },
  { iso: "KW", name: "Kuwait", dial: "965" },
  { iso: "LV", name: "Latvia", dial: "371" },
  { iso: "LB", name: "Lebanon", dial: "961" },
  { iso: "LT", name: "Lithuania", dial: "370" },
  { iso: "LU", name: "Luxembourg", dial: "352" },
  { iso: "MY", name: "Malaysia", dial: "60" },
  { iso: "MV", name: "Maldives", dial: "960" },
  { iso: "MT", name: "Malta", dial: "356" },
  { iso: "MX", name: "Mexico", dial: "52" },
  { iso: "MD", name: "Moldova", dial: "373" },
  { iso: "MA", name: "Morocco", dial: "212" },
  { iso: "MM", name: "Myanmar", dial: "95" },
  { iso: "NP", name: "Nepal", dial: "977" },
  { iso: "NL", name: "Netherlands", dial: "31" },
  { iso: "NZ", name: "New Zealand", dial: "64" },
  { iso: "NG", name: "Nigeria", dial: "234" },
  { iso: "NO", name: "Norway", dial: "47" },
  { iso: "OM", name: "Oman", dial: "968" },
  { iso: "PK", name: "Pakistan", dial: "92" },
  { iso: "PA", name: "Panama", dial: "507" },
  { iso: "PY", name: "Paraguay", dial: "595" },
  { iso: "PE", name: "Peru", dial: "51" },
  { iso: "PH", name: "Philippines", dial: "63" },
  { iso: "PL", name: "Poland", dial: "48" },
  { iso: "PT", name: "Portugal", dial: "351" },
  { iso: "QA", name: "Qatar", dial: "974" },
  { iso: "RO", name: "Romania", dial: "40" },
  { iso: "RU", name: "Russia", dial: "7" },
  { iso: "RW", name: "Rwanda", dial: "250" },
  { iso: "SA", name: "Saudi Arabia", dial: "966" },
  { iso: "SN", name: "Senegal", dial: "221" },
  { iso: "RS", name: "Serbia", dial: "381" },
  { iso: "SG", name: "Singapore", dial: "65" },
  { iso: "SK", name: "Slovakia", dial: "421" },
  { iso: "SI", name: "Slovenia", dial: "386" },
  { iso: "ZA", name: "South Africa", dial: "27" },
  { iso: "KR", name: "South Korea", dial: "82" },
  { iso: "ES", name: "Spain", dial: "34" },
  { iso: "LK", name: "Sri Lanka", dial: "94" },
  { iso: "SE", name: "Sweden", dial: "46" },
  { iso: "CH", name: "Switzerland", dial: "41" },
  { iso: "TW", name: "Taiwan", dial: "886" },
  { iso: "TZ", name: "Tanzania", dial: "255" },
  { iso: "TH", name: "Thailand", dial: "66" },
  { iso: "TN", name: "Tunisia", dial: "216" },
  { iso: "TR", name: "Türkiye", dial: "90" },
  { iso: "UG", name: "Uganda", dial: "256" },
  { iso: "UA", name: "Ukraine", dial: "380" },
  { iso: "AE", name: "United Arab Emirates", dial: "971" },
  { iso: "GB", name: "United Kingdom", dial: "44" },
  { iso: "US", name: "United States", dial: "1" },
  { iso: "UY", name: "Uruguay", dial: "598" },
  { iso: "UZ", name: "Uzbekistan", dial: "998" },
  { iso: "VE", name: "Venezuela", dial: "58" },
  { iso: "VN", name: "Vietnam", dial: "84" },
  { iso: "YE", name: "Yemen", dial: "967" },
  { iso: "ZM", name: "Zambia", dial: "260" },
  { iso: "ZW", name: "Zimbabwe", dial: "263" },
];

/** Flag emoji from the ISO code — two regional-indicator symbols. Avoids
 *  shipping 100+ image assets for what is a two-character transform. */
export function flagOf(iso: string): string {
  return iso
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

/** "+91" for the stored value; the stored form always carries the plus. */
export function toDialValue(c: Country): string {
  return `+${c.dial}`;
}

/** Find the country a stored "+91" maps to. Longest dial code wins so +1876
 *  (Jamaica) is not swallowed by +1 (US). Returns undefined for a value that
 *  matches nothing, which the picker renders as free text rather than
 *  silently rewriting a recruiter's entry. */
export function countryForDial(value: string | null | undefined): Country | undefined {
  const digits = (value ?? "").replace(/[^\d]/g, "");
  if (!digits) return undefined;
  return [...COUNTRIES]
    .sort((a, b) => b.dial.length - a.dial.length)
    .find((c) => c.dial === digits);
}

/** The default ordering: primary market pinned, everything else alphabetical. */
export function orderedCountries(): Country[] {
  const rest = COUNTRIES.filter((c) => c.iso !== PRIMARY_ISO).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const primary = COUNTRIES.find((c) => c.iso === PRIMARY_ISO);
  return primary ? [primary, ...rest] : rest;
}

/**
 * Search by name OR by dial code, chosen from what the user typed.
 *
 * Typing digits (or a leading +) means they are thinking in phone codes, so we
 * match dial-code PREFIXES and nothing else — "1" should narrow to +1 and +1809,
 * not also return every country with a "1" somewhere in its name. Typing letters
 * matches names, with prefix matches ranked above contains matches so "in"
 * offers India before Argentina.
 */
export function searchCountries(query: string): Country[] {
  const q = query.trim();
  if (!q) return orderedCountries();

  const digits = q.replace(/[^\d]/g, "");
  const looksNumeric = /^[+\d]/.test(q) && digits.length > 0;

  if (looksNumeric) {
    return COUNTRIES.filter((c) => c.dial.startsWith(digits)).sort((a, b) => {
      // Exact code first, then shorter codes (the common ones), then by name.
      if (a.dial !== b.dial) {
        if (a.dial === digits) return -1;
        if (b.dial === digits) return 1;
        if (a.dial.length !== b.dial.length) return a.dial.length - b.dial.length;
      }
      return a.name.localeCompare(b.name);
    });
  }

  const lower = q.toLowerCase();
  const starts: Country[] = [];
  const contains: Country[] = [];
  for (const c of COUNTRIES) {
    const name = c.name.toLowerCase();
    if (name.startsWith(lower) || c.iso.toLowerCase() === lower) starts.push(c);
    else if (name.includes(lower)) contains.push(c);
  }
  const byName = (a: Country, b: Country) => a.name.localeCompare(b.name);
  return [...starts.sort(byName), ...contains.sort(byName)];
}
