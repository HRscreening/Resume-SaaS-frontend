import { describe, expect, it } from "vitest";

import { fibonacciSphere, orbMotionFor, project, radialOffset, sweepGlow } from "./orbGeometry";

describe("fibonacciSphere", () => {
  it("puts every point on the unit sphere", () => {
    for (const p of fibonacciSphere(500)) {
      expect(Math.hypot(p.x, p.y, p.z)).toBeCloseTo(1, 6);
    }
  });

  it("spreads points over both hemispheres evenly", () => {
    const points = fibonacciSphere(1000);
    const top = points.filter((p) => p.y > 0).length;
    expect(top).toBe(500);
  });
});

describe("radialOffset", () => {
  it("is zero in silence, so a quiet orb is a clean sphere", () => {
    expect(radialOffset(0.3, 0, 0.14, 12.5)).toBe(0);
  });

  it("grows with the voice level and never exceeds the ripple", () => {
    const quiet = radialOffset(0, 0.2, 0.14, 0);
    const loud = radialOffset(0, 1, 0.14, 0);
    expect(loud).toBeGreaterThan(quiet);
    for (let lat = -1.5; lat <= 1.5; lat += 0.1) {
      expect(radialOffset(lat, 1, 0.14, 3)).toBeLessThanOrEqual(0.14 + 1e-9);
    }
  });
});

describe("sweepGlow", () => {
  it("is off when there is no sweep", () => {
    expect(sweepGlow(0, 1, 0)).toBe(0);
  });

  it("starts at the top and reaches the bottom", () => {
    expect(sweepGlow(Math.PI / 2, 0, 1.6)).toBeCloseTo(1);
    expect(sweepGlow(-Math.PI / 2, 1.6 * 0.999, 1.6)).toBeGreaterThan(0.9);
    expect(sweepGlow(-Math.PI / 2, 0, 1.6)).toBe(0);
  });
});

describe("orbMotionFor", () => {
  it("moves each state differently", () => {
    expect(orbMotionFor("speaking").source).toBe("interviewer");
    expect(orbMotionFor("listening").source).toBe("candidate");
    expect(orbMotionFor("thinking").sweepPeriod).toBeGreaterThan(0);
    expect(orbMotionFor("reconnecting").spin).toBe(0);
  });
});

describe("project", () => {
  it("keeps the front of the sphere in front", () => {
    const front = project({ x: 0, y: 0, z: 1, lat: 0 }, 0, 0, 100, 100, 50);
    const back = project({ x: 0, y: 0, z: -1, lat: 0 }, 0, 0, 100, 100, 50);
    expect(front.depth).toBeGreaterThan(back.depth);
  });

  it("pushes a displaced point further from the centre", () => {
    const p = { x: 1, y: 0, z: 0, lat: 0 };
    const flat = project(p, 0, 0, 0, 0, 50);
    const pushed = project(p, 0, 0.1, 0, 0, 50);
    expect(Math.abs(pushed.sx)).toBeGreaterThan(Math.abs(flat.sx));
  });
});
