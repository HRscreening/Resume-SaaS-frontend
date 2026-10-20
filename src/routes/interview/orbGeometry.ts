// The interviewer orb's maths, kept free of canvas and React so it can be
// tested: where the points sit, how each presence state moves them, and how
// a point lands on the 2D canvas.
//
// The look is a point cloud on a sphere, deliberately STRUCTURED: points
// spread evenly (a Fibonacci lattice), motion travels along latitude rings,
// nothing blobs or wobbles. An earlier free-form orb on this screen was
// rejected as "too organic"; rings that ripple with the real voice level
// read as a voice, not as a creature.

export type OrbState = "speaking" | "listening" | "thinking" | "reconnecting" | "idle";

export interface OrbPoint {
  x: number;
  y: number;
  z: number;
  // Latitude, -PI/2 (bottom) .. PI/2 (top). Every ring effect keys off it.
  lat: number;
}

export interface OrbMotion {
  // Rotation about the vertical axis, radians per second.
  spin: number;
  // Peak radial displacement as a fraction of the radius, at level 1.
  ripple: number;
  // Which side's voice drives the ripple.
  source: "interviewer" | "candidate" | "none";
  // Thinking: a bright band sweeping pole to pole, one pass per this many
  // seconds. 0 = no band.
  sweepPeriod: number;
}

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

// `count` points spread evenly over the unit sphere.
export function fibonacciSphere(count: number): OrbPoint[] {
  const points: OrbPoint[] = [];
  for (let i = 0; i < count; i++) {
    const y = 1 - (2 * (i + 0.5)) / count;
    const ring = Math.sqrt(1 - y * y);
    const theta = GOLDEN_ANGLE * i;
    points.push({ x: Math.cos(theta) * ring, y, z: Math.sin(theta) * ring, lat: Math.asin(y) });
  }
  return points;
}

const MOTION: Record<OrbState, OrbMotion> = {
  speaking: { spin: 0.28, ripple: 0.14, source: "interviewer", sweepPeriod: 0 },
  listening: { spin: 0.12, ripple: 0.06, source: "candidate", sweepPeriod: 0 },
  thinking: { spin: 0.2, ripple: 0, source: "none", sweepPeriod: 1.6 },
  reconnecting: { spin: 0, ripple: 0, source: "none", sweepPeriod: 0 },
  idle: { spin: 0.08, ripple: 0, source: "none", sweepPeriod: 0 },
};

export function orbMotionFor(state: OrbState): OrbMotion {
  return MOTION[state];
}

// How far a point is pushed out from the sphere: rings travelling from the
// equator outwards, scaled by the live voice level. With level 0 there is
// no displacement at all, so silence draws a clean sphere.
export function radialOffset(lat: number, level: number, ripple: number, t: number): number {
  if (level <= 0 || ripple <= 0) return 0;
  const rings = Math.sin(lat * 6 - t * 5);
  return ripple * level * (0.55 + 0.45 * rings);
}

// 0..1 brightness boost from the thinking sweep for a point at `lat`.
export function sweepGlow(lat: number, t: number, period: number): number {
  if (period <= 0) return 0;
  const phase = (t % period) / period; // 0..1, top to bottom
  const bandLat = Math.PI / 2 - phase * Math.PI;
  const distance = Math.abs(lat - bandLat);
  return Math.max(0, 1 - distance / 0.35);
}

export interface Projected {
  sx: number;
  sy: number;
  // 0 (back of the sphere) .. 1 (front), for size and alpha.
  depth: number;
  // -1 (left) .. 1 (right), for the colour gradient.
  across: number;
}

// Rotate a point about the vertical axis by `angle` (plus a fixed tilt so
// the rings read as rings, not lines), push it out by `offset`, and
// project it onto a canvas of the given centre and radius.
const TILT = 0.38;

export function project(
  p: OrbPoint,
  angle: number,
  offset: number,
  cx: number,
  cy: number,
  radius: number,
): Projected {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const x1 = p.x * cos - p.z * sin;
  const z1 = p.x * sin + p.z * cos;
  const y2 = p.y * Math.cos(TILT) - z1 * Math.sin(TILT);
  const z2 = p.y * Math.sin(TILT) + z1 * Math.cos(TILT);
  const r = radius * (1 + offset);
  return { sx: cx + x1 * r, sy: cy - y2 * r, depth: (z2 + 1) / 2, across: x1 };
}
