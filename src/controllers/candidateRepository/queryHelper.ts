import type {MatchTierId,RangeFilter} from "@/types";
import type {CandidateRepositoryQueryParams,SortField,SortRule} from "@/types/candidate.type";

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
const VALID_SIMPLE_FIELDS: ReadonlySet<string> = new Set(["best_score", "avg_score","candidate_name", "stage"]);

// Default sort is overall_score descending — recruiters land on a ranked
// view without having to click anything. The column header reflects this
// because <SortableHeader> derives its indicator from state.sort.
export const DEFAULT_SORT: SortRule[] = [{ field: "avg_score", direction: "desc" }];

export const DEFAULT_QUERY_STATE: CandidateRepositoryQueryParams = {
  page: 1,
  page_size: 10,
  search: "",
  stage: [],
  match: [],
  best_score: undefined,
  avg_score: undefined,
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

export function decodeQueryState(search: Record<string, unknown>): CandidateRepositoryQueryParams {
  const bestMin = parseNum(search.best_min);
  const bestMax = parseNum(search.best_max);
  const best_score: RangeFilter | undefined =
    bestMin === undefined && bestMax === undefined
      ? undefined
      : { min: bestMin, max: bestMax };

  const avgMin = parseNum(search.avg_min);
  const avgMax = parseNum(search.avg_max);
  const avg_score: RangeFilter | undefined =
    avgMin === undefined && avgMax === undefined
      ? undefined
      : { min: avgMin, max: avgMax };

  const match = parseCsv(search.match).filter((m): m is MatchTierId =>
    VALID_TIERS.has(m as MatchTierId),
  );

  return {
    page: parseNum(search.page) ?? DEFAULT_QUERY_STATE.page,
    page_size: parseNum(search.page_size) ?? DEFAULT_QUERY_STATE.page_size,
    search: typeof search.search === "string" ? search.search : "",
    stage: parseCsv(search.stage),
    match,
    avg_score,
    best_score,
    sort: search.sort === undefined ? DEFAULT_SORT : parseSort(search.sort),
  };
}

// Returns a search-params object suitable for handing to TanStack Router's
// navigate({ search }). Undefined / empty values are omitted so the URL
// stays clean (`/screenings/abc` instead of `/screenings/abc?search=&...`).
export function encodeQueryState(state: CandidateRepositoryQueryParams): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  if (state.page !== DEFAULT_QUERY_STATE.page) out.page = state.page;
  if (state.page_size !== DEFAULT_QUERY_STATE.page_size) out.page_size = state.page_size;
  if (state.search) out.search = state.search;
  if (state.stage.length > 0) out.stage = state.stage.join(",");
  if (state.match.length > 0) out.match = state.match.join(",");
  if (state.best_score?.min !== undefined) out.best_score_min = state.best_score.min;
  if (state.best_score?.max !== undefined) out.best_score_max = state.best_score.max;
  if (state.avg_score?.min !== undefined) out.avg_score_min = state.avg_score.min;
  if (state.avg_score?.max !== undefined) out.avg_score_max = state.avg_score.max;

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
export function toRequestParams(state: CandidateRepositoryQueryParams): URLSearchParams {
  const qs = new URLSearchParams();
  qs.set("page", String(state.page));
  qs.set("page_size", String(state.page_size));
  if (state.search) qs.set("search", state.search);
  if (state.stage.length > 0) qs.set("stage", state.stage.join(","));
  if (state.best_score?.min !== undefined) qs.set("best_score_min", String(state.best_score.min));
  if (state.best_score?.max !== undefined) qs.set("best_score_max", String(state.best_score.max));
  if (state.avg_score?.min !== undefined) qs.set("avg_score_min", String(state.avg_score.min));
  if (state.avg_score?.max !== undefined) qs.set("avg_score_max", String(state.avg_score.max));
  if (state.sort.length > 0) {
    qs.set("sort", state.sort.map((s) => `${s.field}:${s.direction}`).join(","));
  }
  return qs;
}

// True when nothing beyond page/page_size is active. Used to decide
// whether to render the "Clear all" affordance and active-chip strip.
export function hasActiveFilters(state: CandidateRepositoryQueryParams): boolean {
  return (
    !!state.search ||
    state.stage.length > 0 ||
    state.match.length > 0 ||
    !!state.best_score?.min ||
    !!state.avg_score?.max ||
    (state.sort.length > 0 && !isDefaultSort(state.sort))
  );
}
