import { useEffect, useRef } from "react";

import { createLevelLoop } from "./audioLevelLoop";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

const GREEN = "#0F8A46"; // matches the "speaking" color used elsewhere on this screen
const AMBER = "#D97706"; // matches the reconnecting banner's tone
const GRAY = "#A3A3A3";

interface VoiceOrbProps {
  // Null before the interviewer's audio track has subscribed (brief, at the
  // very start of a call) or while it is between tracks (a reconnect). The
  // orb still renders in that window — at rest, in the current state's
  // color — it just has no live amplitude to draw from yet.
  analyser: AnalyserNode | null;
  // Whether the interviewer is talking right now. Sourced from LiveKit's own
  // active-speaker detection (already computed in InterviewRoom), not from
  // this component's amplitude tap — so the color and label stay correct
  // even in the rare case the tap itself is unavailable.
  speaking: boolean;
  reconnecting: boolean;
  size: "large" | "compact";
}

// The candidate's one visual anchor for "is there a person on the other end
// of this, and are they talking." Driven by real audio amplitude
// (useAudioAnalyser + createLevelLoop), never by a timer: silence renders as
// stillness, because a shape that moves on its own schedule would tell the
// candidate something false about what is happening in the room.
export default function VoiceOrb({ analyser, speaking, reconnecting, size }: VoiceOrbProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dimension = size === "large" ? 168 : 56;
  const label = reconnecting ? "Reconnecting" : speaking ? "Interviewer speaking" : "Interviewer listening";

  useEffect(() => {
    if (prefersReducedMotion) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimension * dpr;
    canvas.height = dimension * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (!analyser) {
      // No track to read yet: draw one resting frame so the orb is never a
      // blank canvas, and stop — there is nothing to animate from.
      drawOrbFrame(ctx, dimension, 0, speaking, reconnecting);
      return;
    }

    return createLevelLoop(analyser, (level) => {
      drawOrbFrame(ctx, dimension, level, speaking, reconnecting);
    });
  }, [analyser, prefersReducedMotion, dimension, speaking, reconnecting]);

  if (prefersReducedMotion) {
    return <StaticOrb dimension={dimension} speaking={speaking} reconnecting={reconnecting} label={label} />;
  }

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={label}
      style={{ width: dimension, height: dimension }}
    />
  );
}

// `prefers-reduced-motion: reduce` turns the live, amplitude-driven canvas
// off entirely rather than slowing it down: this renders instead, a plain
// shape with no animation of any kind, that still answers the same question
// (is the interviewer talking) through color and fill alone, updated only
// when that discrete state actually changes.
function StaticOrb({
  dimension,
  speaking,
  reconnecting,
  label,
}: {
  dimension: number;
  speaking: boolean;
  reconnecting: boolean;
  label: string;
}) {
  const color = reconnecting ? AMBER : speaking ? GREEN : GRAY;
  const filled = speaking || reconnecting;
  return (
    <div
      role="img"
      aria-label={label}
      style={{
        width: dimension,
        height: dimension,
        borderRadius: "9999px",
        border: `2px solid ${color}`,
        backgroundColor: filled ? color : "transparent",
      }}
    />
  );
}

function withAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Pure canvas drawing, no React and no state of its own: called once per
// animation frame with the current smoothed amplitude (0..1). Layered soft
// rings plus a solid core, all sized directly off `level` — nothing here
// depends on elapsed time, so a constant `level` (including 0, true silence)
// produces a perfectly still frame.
function drawOrbFrame(
  ctx: CanvasRenderingContext2D,
  dimension: number,
  level: number,
  speaking: boolean,
  reconnecting: boolean,
): void {
  ctx.clearRect(0, 0, dimension, dimension);
  const cx = dimension / 2;
  const cy = dimension / 2;
  const base = dimension * 0.28;
  const color = reconnecting ? AMBER : speaking ? GREEN : GRAY;
  const active = speaking || reconnecting;

  // Outer glow rings: two translucent circles that grow with amplitude,
  // calmest when idle (small, faint) and fullest mid-word.
  for (let ring = 2; ring >= 1; ring--) {
    const radius = base * (1 + ring * 0.22 + level * ring * 0.4);
    const alpha = (active ? 0.14 : 0.07) / ring;
    ctx.beginPath();
    ctx.fillStyle = withAlpha(color, alpha);
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  // Solid core, always present so the resting state still reads as a
  // deliberate shape rather than an empty frame.
  const coreRadius = base * (0.85 + level * 0.3);
  ctx.beginPath();
  ctx.fillStyle = withAlpha(color, active ? 0.92 : 0.5);
  ctx.arc(cx, cy, coreRadius, 0, Math.PI * 2);
  ctx.fill();

  // Thin resting outline at the base radius, independent of amplitude, so
  // the shape's "home" size is always legible even at the animation's
  // quietest point.
  ctx.beginPath();
  ctx.strokeStyle = withAlpha(color, 0.35);
  ctx.lineWidth = 1.5;
  ctx.arc(cx, cy, base, 0, Math.PI * 2);
  ctx.stroke();
}
