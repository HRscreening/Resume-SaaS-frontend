import { useEffect, useMemo, useRef } from "react";

import { createLevelLoop } from "./audioLevelLoop";
import {
  fibonacciSphere,
  orbMotionFor,
  project,
  radialOffset,
  sweepGlow,
  type OrbState,
} from "./orbGeometry";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

// The interviewer, drawn as a point cloud on a sphere. Its only inputs are
// the presence state and the two real audio levels (see orbGeometry for
// how each state moves it). Drawn on a canvas by one requestAnimationFrame
// loop, never through React state: a state update per frame for an hour
// would re-render the whole room 60 times a second.

const POINT_COUNT = 1400;
// Copper to sand, left to right across the sphere; amber while reconnecting.
const COPPER: RGB = [200, 90, 23];
const SAND: RGB = [233, 201, 161];
const AMBER: RGB = [217, 119, 6];

type RGB = [number, number, number];

interface InterviewerOrbProps {
  state: OrbState;
  interviewerAnalyser: AnalyserNode | null;
  candidateAnalyser: AnalyserNode | null;
  // Rendered width and height in CSS pixels.
  size: number;
}

export default function InterviewerOrb({
  state,
  interviewerAnalyser,
  candidateAnalyser,
  size,
}: InterviewerOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  const points = useMemo(() => fibonacciSphere(POINT_COUNT), []);
  const levelsRef = useRef({ interviewer: 0, candidate: 0 });
  const stateRef = useRef(state);
  stateRef.current = state;
  // Under reduced motion there is no loop: one still frame per state.
  const stillFrameKey = reducedMotion ? state : null;

  // Live levels, written into a ref the draw loop reads.
  useEffect(() => {
    if (reducedMotion) return;
    const stops = [
      interviewerAnalyser &&
        createLevelLoop(interviewerAnalyser, (level) => {
          levelsRef.current.interviewer = level;
        }),
      candidateAnalyser &&
        createLevelLoop(candidateAnalyser, (level) => {
          levelsRef.current.candidate = level;
        }),
    ];
    return () => stops.forEach((stop) => stop?.());
  }, [interviewerAnalyser, candidateAnalyser, reducedMotion]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    let angle = 0;
    let last = performance.now();
    let frameId = 0;

    function draw(now: number) {
      const t = now / 1000;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const current = stateRef.current;
      const motion = orbMotionFor(current);
      angle += motion.spin * dt;
      const level =
        motion.source === "interviewer"
          ? levelsRef.current.interviewer
          : motion.source === "candidate"
            ? levelsRef.current.candidate
            : 0;
      paint(ctx!, current, angle, level, t, motion.ripple, motion.sweepPeriod);
      if (!reducedMotion) frameId = requestAnimationFrame(draw);
    }

    function paint(
      c: CanvasRenderingContext2D,
      current: OrbState,
      rot: number,
      level: number,
      t: number,
      ripple: number,
      sweepPeriod: number,
    ) {
      const half = size / 2;
      const radius = size * 0.36;
      c.clearRect(0, 0, size, size);
      // A soft halo behind the sphere that brightens with the voice.
      const halo = c.createRadialGradient(half, half, radius * 0.2, half, half, radius * 1.45);
      const haloColor = current === "reconnecting" ? AMBER : COPPER;
      halo.addColorStop(0, `rgba(${haloColor[0]},${haloColor[1]},${haloColor[2]},${0.1 + level * 0.22})`);
      halo.addColorStop(1, "rgba(0,0,0,0)");
      c.fillStyle = halo;
      c.fillRect(0, 0, size, size);
      for (const p of points) {
        const glow = sweepGlow(p.lat, t, sweepPeriod);
        const offset = radialOffset(p.lat, level, ripple, t);
        const { sx, sy, depth, across } = project(p, rot, offset, half, half, radius);
        const base = current === "reconnecting" ? AMBER : mix(COPPER, SAND, (across + 1) / 2);
        const alpha = Math.min(1, 0.1 + depth * 0.8 + glow * 0.9);
        const dot = 0.45 + depth * 0.95 + glow * 0.9;
        c.fillStyle = `rgba(${base[0]},${base[1]},${base[2]},${alpha})`;
        c.beginPath();
        c.arc(sx, sy, dot, 0, Math.PI * 2);
        c.fill();
      }
    }

    frameId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameId);
  }, [points, size, reducedMotion, stillFrameKey]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size }}
      aria-hidden="true"
      className="block"
    />
  );
}

function mix(a: RGB, b: RGB, k: number): RGB {
  return [
    Math.round(a[0] + (b[0] - a[0]) * k),
    Math.round(a[1] + (b[1] - a[1]) * k),
    Math.round(a[2] + (b[2] - a[2]) * k),
  ];
}
