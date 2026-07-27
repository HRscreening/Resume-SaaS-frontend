import type {
  CandidateQueryState,
  MatchTierId,
  RangeFilter,
  SortField,
  SortRule,
} from "@/types";

// URL <-> CandidateQueryState. We keep the shape flat & string-y so the
// router's untyped useSearch can round-trip it without a schema. Unknown
// keys are ignored on decode, so adding a new filter in the future doesn't
// break old URLs.
//
// Encoding:
//   page, page_size               number
//   search                        string
//   stage                         CSV
//   match                         CSV of MatchTierId
//   overall_min, overall_max      number
//   cat_min__<name>, cat_max__<name>  number   (`__` separator so category
//                                              names with colons survive)
//   sort                          CSV of `field:direction`

const VALID_TIERS: ReadonlySet<MatchTierId> = new Set(["strong", "potential", "risky", "poor"]);
const VALID_DIRECTIONS: ReadonlySet<"asc" | "desc"> = new Set(["asc", "desc"]);
const VALID_SIMPLE_FIELDS: ReadonlySet<string> = new Set(["overall_score", "candidate_name", "stage"]);

// Default sort is overall_score descending — recruiters land on a ranked
// view without having to click anything. The column header reflects this
// because <SortableHeader> derives its indicator from state.sort.
export const DEFAULT_SORT: SortRule[] = [{ field: "overall_score", direction: "desc" }];

export const DEFAULT_QUERY_STATE: CandidateQueryState = {
  page: 1,
  limit: 10,
  search: "",
  stage: [],
  match: [],
  overall_score: undefined,
  category_scores: {},
  sort: DEFAULT_SORT,
};

function isDefaultSort(sort: SortRule[]): boolean {
  if (sort.length !== DEFAULT_SORT.length) return false;
  return sort.every((r, i) => r.field === DEFAULT_SORT[i].field && r.direction === DEFAULT_SORT[i].direction);
}

function parseNum(v: unknown): number | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function parseCsv(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String).filter(Boolean);
  if (typeof v === "string" && v.length > 0) return v.split(",").filter(Boolean);
  return [];
}

function parseSort(v: unknown): SortRule[] {
  const raw = parseCsv(v);
  const out: SortRule[] = [];
  for (const entry of raw) {
    // field can contain a colon ("cat:Technical"), so split on the LAST colon
    const idx = entry.lastIndexOf(":");
    if (idx === -1) continue;
    const field = entry.slice(0, idx);
    const direction = entry.slice(idx + 1) as "asc" | "desc";
    if (!VALID_DIRECTIONS.has(direction)) continue;
    if (!isValidSortField(field)) continue;
    out.push({ field: field as SortField, direction });
  }
  return out;
}

function isValidSortField(field: string): boolean {
  if (VALID_SIMPLE_FIELDS.has(field)) return true;
  if (field.startsWith("cat:") && field.length > 4) return true;
  return false;
}

export function decodeQueryState(search: Record<string, unknown>): CandidateQueryState {
  const overallMin = parseNum(search.overall_min);
  const overallMax = parseNum(search.overall_max);
  const overall_score: RangeFilter | undefined =
    overallMin === undefined && overallMax === undefined
      ? undefined
      : { min: overallMin, max: overallMax };

  const category_scores: Record<string, RangeFilter> = {};
  for (const key of Object.keys(search)) {
    if (key.startsWith("cat_min__")) {
      const name = key.slice("cat_min__".length);
      const min = parseNum(search[key]);
      if (min !== undefined) category_scores[name] = { ...category_scores[name], min };
    } else if (key.startsWith("cat_max__")) {
      const name = key.slice("cat_max__".length);
      const max = parseNum(search[key]);
      if (max !== undefined) category_scores[name] = { ...category_scores[name], max };
    }
  }

  const match = parseCsv(search.match).filter((m): m is MatchTierId =>
    VALID_TIERS.has(m as MatchTierId),
  );

  return {
    page: parseNum(search.page) ?? DEFAULT_QUERY_STATE.page,
    limit: parseNum(search.page_size) ?? DEFAULT_QUERY_STATE.limit,
    search: typeof search.search === "string" ? search.search : "",
    stage: parseCsv(search.stage),
    match,
    overall_score,
    category_scores,
    sort: search.sort === undefined ? DEFAULT_SORT : parseSort(search.sort),
  };
}

// Returns a search-params object suitable for handing to TanStack Router's
// navigate({ search }). Undefined / empty values are omitted so the URL
// stays clean (`/screenings/abc` instead of `/screenings/abc?search=&...`).
export function encodeQueryState(state: CandidateQueryState): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  if (state.page !== DEFAULT_QUERY_STATE.page) out.page = state.page ?? "";
  if (state.limit !== DEFAULT_QUERY_STATE.limit) out.page_size = state.limit;
  if (state.search) out.search = state.search;
  if (state.stage.length > 0) out.stage = state.stage.join(",");
  if (state.match.length > 0) out.match = state.match.join(",");
  if (state.overall_score?.min !== undefined) out.overall_min = state.overall_score.min;
  if (state.overall_score?.max !== undefined) out.overall_max = state.overall_score.max;
  for (const [name, range] of Object.entries(state.category_scores)) {
    if (range.min !== undefined) out[`cat_min__${name}`] = range.min;
    if (range.max !== undefined) out[`cat_max__${name}`] = range.max;
  }
  // Omit the sort param when it matches the default so the URL stays clean
  // on first load. Decode re-applies DEFAULT_SORT when the key is absent.
  if (state.sort.length > 0 && !isDefaultSort(state.sort)) {
    out.sort = state.sort.map((s) => `${s.field}:${s.direction}`).join(",");
  }
  return out;
}

// Backend query-string params. Same shape as URL encoding, but always
// includes page/page_size and uses the exact key names from the backend
// contract doc. Returns a URLSearchParams the API client can append.
export function toRequestParams(state: CandidateQueryState): URLSearchParams {
  const qs = new URLSearchParams();
  qs.set("page", String(state.page));
  qs.set("", String(state.limit));
  if (state.search) qs.set("search", state.search);
  if (state.stage.length > 0) qs.set("stage", state.stage.join(","));
  if (state.overall_score?.min !== undefined) qs.set("overall_min", String(state.overall_score.min));
  if (state.overall_score?.max !== undefined) qs.set("overall_max", String(state.overall_score.max));
  for (const [name, range] of Object.entries(state.category_scores)) {
    if (range.min !== undefined) qs.set(`cat_min[${name}]`, String(range.min));
    if (range.max !== undefined) qs.set(`cat_max[${name}]`, String(range.max));
  }
  if (state.sort.length > 0) {
    qs.set("sort", state.sort.map((s) => `${s.field}:${s.direction}`).join(","));
  }
  return qs;
}

// True when nothing beyond page/page_size is active. Used to decide
// whether to render the "Clear all" affordance and active-chip strip.
export function hasActiveFilters(state: CandidateQueryState): boolean {
  return (
    !!state.search ||
    state.stage.length > 0 ||
    state.match.length > 0 ||
    !!state.overall_score?.min ||
    !!state.overall_score?.max ||
    Object.keys(state.category_scores).length > 0 ||
    (state.sort.length > 0 && !isDefaultSort(state.sort))
  );
}
