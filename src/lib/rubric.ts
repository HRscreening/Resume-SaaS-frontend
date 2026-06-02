// Shared rubric editor constants & helpers.
//
// These power both the "New job" wizard (src/routes/NewScreening.tsx) and the
// standalone rubric editor (src/routes/EditRubric.tsx). Keeping them here means
// colours, importance labels, and the weight→pill mapping stay consistent
// across every place a rubric is rendered.

// Per-category accent colours, indexed by category position (0,1,2). Falls back
// to the first entry for any extra categories the backend might emit.
export const CATEGORY_COLORS = [
  { bg: "bg-blue-50",   border: "border-blue-200",   text: "text-blue-700",   dot: "#3B82F6" },
  { bg: "bg-amber-50",  border: "border-amber-200",  text: "text-amber-700",  dot: "#F59E0B" },
  { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700", dot: "#8B5CF6" },
] as const;

export function categoryColor(index: number) {
  return CATEGORY_COLORS[index] ?? CATEGORY_COLORS[0];
}

// Subcategory importance is a 1–5 scale. These are the labels shown under the
// 1-5 picker and as button tooltips.
export const IMPORTANCE_LABELS = ["Low", "Moderate", "Standard", "Important", "Critical"] as const;

// Category importance pills — replaces the 0-100 slider in the new-job wizard.
// Stored weights map to a pill bucket; clicking a pill snaps the weight to the
// bucket's representative value. The ranker normalises whatever values we send
// (weighted avg) so users never need to make these sum to 100 — that constraint
// is intentionally dropped from the UI.
export const CATEGORY_PILLS = [
  { key: "Low",      value: 10 },
  { key: "Medium",   value: 25 },
  { key: "High",     value: 50 },
  { key: "Critical", value: 80 },
] as const;

export type CategoryPill = (typeof CATEGORY_PILLS)[number]["key"];

export function weightToCategoryPill(weight: number): CategoryPill {
  if (weight <= 15) return "Low";
  if (weight <= 35) return "Medium";
  if (weight <= 65) return "High";
  return "Critical";
}

// Max subcategories allowed per category in the editor UI.
export const MAX_SUBCATEGORIES = 5;
