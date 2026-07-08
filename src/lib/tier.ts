type Tier = {
  id: TierId;
  label: string;
  min: number;
  dot: string;
  bg?: string;
  color?: string;
  border?: string;
};

export const TIERS :Tier[] = [
  { id: "strong",    label: "Strong", min: 75, dot: "#22C55E" },
  { id: "potential", label: "Potential",    min: 55, dot: "#EAB308" },
  { id: "risky",     label: "Risky",        min: 35, dot: "#F97316" },
  { id: "poor",      label: "Poor",     min: 0,  dot: "#EF4444" },
] as const;

export type TierId = "strong" | "potential" | "risky" | "poor";

export function getTier(score: number): Tier {
  if (score >= 75) return TIERS[0];
  if (score >= 55) return TIERS[1];
  if (score >= 35) return TIERS[2];
  return TIERS[3];
}
