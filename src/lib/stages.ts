import type { StagesMap, HiringStage } from "@/types";

export interface StageEntry {
  name: string;
  color: string;
  index: number;
}

export const REJECTED_STAGE = "Rejected";
export const REJECTED_COLOR = "#EF4444";

export const DEFAULT_STAGES: StagesMap = {
  Applied:     { color: "#A0AEC0", index: 1 },
  Shortlisted: { color: "#63B3ED", index: 2 },
  Interviewed: { color: "#4299E1", index: 3 },
  Offered:     { color: "#48BB78", index: 4 },
};

// Notion-style soft palette for the color picker.
export const STAGE_PALETTE = [
  { name: "Gray",   color: "#A0AEC0" },
  { name: "Brown",  color: "#A0522D" },
  { name: "Orange", color: "#ED8936" },
  { name: "Yellow", color: "#ECC94B" },
  { name: "Green",  color: "#48BB78" },
  { name: "Teal",   color: "#38B2AC" },
  { name: "Blue",   color: "#4299E1" },
  { name: "Sky",    color: "#63B3ED" },
  { name: "Purple", color: "#9F7AEA" },
  { name: "Pink",   color: "#ED64A6" },
  { name: "Red",    color: "#EF4444" },
];

export function sortedStages(stages: StagesMap | undefined): StageEntry[] {
  if (!stages) return [];
  return Object.entries(stages)
    .map(([name, cfg]) => ({ name, color: cfg.color, index: cfg.index }))
    .sort((a, b) => a.index - b.index);
}

// Re-index a list of stage entries to a contiguous 1..N sequence,
// preserving order. Returned in StagesMap shape so it can be PATCHed.
export function reindex(entries: StageEntry[]): StagesMap {
  const out: StagesMap = {};
  entries.forEach((e, i) => {
    out[e.name] = { color: e.color, index: i + 1 };
  });
  return out;
}

export function getStageMeta(
  stage: HiringStage | undefined,
  stages: StagesMap | undefined,
): { color: string; index: number | null } {
  if (!stage) return { color: "#A0AEC0", index: null };
  if (stage === REJECTED_STAGE) return { color: REJECTED_COLOR, index: null };
  const cfg = stages?.[stage];
  if (cfg) return { color: cfg.color, index: cfg.index };
  return { color: "#A0AEC0", index: null };
}

// Mix a hex color toward white for a soft tinted pill background.
// `amount` is the white share (0..1); 0.85 produces a Notion-like wash.
export function tintColor(hex: string, amount = 0.85): string {
  const c = hex.replace("#", "");
  if (c.length !== 6) return hex;
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  const mix = (channel: number) => Math.round(channel + (255 - channel) * amount);
  const toHex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${toHex(mix(r))}${toHex(mix(g))}${toHex(mix(b))}`;
}

// Foreground text color tuned to sit on top of `tintColor(color)`.
// We darken the source hue by mixing toward black so the label keeps
// chromatic identity (orange pill -> orange-brown text), like Notion.
export function shadeColor(hex: string, amount = 0.55): string {
  const c = hex.replace("#", "");
  if (c.length !== 6) return hex;
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  const mix = (channel: number) => Math.round(channel * (1 - amount));
  const toHex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${toHex(mix(r))}${toHex(mix(g))}${toHex(mix(b))}`;
}
