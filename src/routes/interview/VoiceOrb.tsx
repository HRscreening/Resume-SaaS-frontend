import { useEffect, useRef } from "react";

import { createLevelLoop } from "./audioLevelLoop";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

// Warm brand accent (--copper / --copper-light in globals.css) — used here
// instead of a status-console green so a hands-free hour in this screen
// reads as a room, not a dashboard. Amber is kept for reconnecting only: a
// real warning state, distinct in kind from ordinary speaking. Neutral is
// the "nobody's talking" color for either side, so color alone always
// tells the truth about who is active right now.
const COPPER = "#C85A17";
const COPPER_LIGHT = "#E8753A";
const AMBER = "#D97706";
const NEUTRAL = "#A3A3A3";
const STAGE = "#EAE7DF"; // --ivory-dark

// How many points make up a blob's outline. High enough to read as a smooth
// organic edge at this size, cheap enough to rebuild on every frame.
const BLOB_SEGMENTS = 48;

interface VoicePresence {
  // Null before that side's audio track has subscribed/published (brief, at
  // the very start of a call) or while it is between tracks (a reconnect,
  // or — for the candidate — a mute/unmute cycle that swaps in a fresh
  // MediaStreamTrack). The orb still renders in that window, at rest; it
  // just has no live amplitude to draw from yet.
  analyser: AnalyserNode | null;
  // Sourced from LiveKit's own active-speaker detection (computed once in
  // InterviewRoom from RoomEvent.ActiveSpeakersChanged), not from this
  // component's amplitude tap — so color stays correct even if a tap is
  // briefly unavailable on one side.
  speaking: boolean;
}

interface VoiceOrbProps {
  // The interviewer: rendered as the outer, larger glow — the presence
  // surrounding the candidate.
  interviewer: VoicePresence;
  // The candidate's own voice: rendered as the inner, smaller glow, so
  // speaking reads as speaking to something rather than into a void — the
  // whole point of giving this side a tap at all. See useLocalAudioTrack
  // for how the candidate's MediaStreamTrack is obtained; see
  // useAudioAnalyser (reused unchanged for both sides) for why the tap
  // cannot affect what either party actually hears.
  candidate: VoicePresence;
  reconnecting: boolean;
  size: "large" | "compact";
}

// The candidate's one visual anchor for "is there a person on the other end
// of this, are they talking, and am I being heard." Two amplitude-driven
// presences share one shape, each rendered as a soft, glowing, organically
// deforming blob rather than a flat ring: an outer one for the interviewer,
// an inner one for the candidate's own voice. Both are driven by real audio
// amplitude (useAudioAnalyser + createLevelLoop) on their own independent
// track, never by a timer — a blob's edge is a fixed function of angle and
// that side's current amplitude only, with no time term anywhere in it, so
// a constant level (including 0, true silence) always produces the exact
// same frame. A shape that deformed or glowed on its own schedule would
// tell the candidate something false about what is happening in the room.
export default function VoiceOrb({ interviewer, candidate, reconnecting, size }: VoiceOrbProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dimension = size === "large" ? 200 : 60;
  const label = describeLabel(interviewer.speaking, candidate.speaking, reconnecting);

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

    // Latest smoothed amplitude for each side, updated by that side's own
    // independent rAF loop (below) and read together on every redraw.
    // Neither side's loop runs at all while that side has no analyser yet,
    // so a missing track can never be misread as "silence driving the
    // shape" — it simply never contributes a frame.
    let interviewerLevel = 0;
    let candidateLevel = 0;

    function render() {
      drawOrbFrame(
        ctx!,
        dimension,
        interviewerLevel,
        candidateLevel,
        interviewer.speaking,
        candidate.speaking,
        reconnecting,
      );
    }

    // One resting frame immediately, so neither side ever shows a blank
    // canvas while waiting for its first analyser frame (or forever, if a
    // side's track never arrives).
    render();

    const stopInterviewer = interviewer.analyser
      ? createLevelLoop(interviewer.analyser, (level) => {
          interviewerLevel = level;
          render();
        })
      : null;
    const stopCandidate = candidate.analyser
      ? createLevelLoop(candidate.analyser, (level) => {
          candidateLevel = level;
          render();
        })
      : null;

    return () => {
      stopInterviewer?.();
      stopCandidate?.();
    };
  }, [
    interviewer.analyser,
    interviewer.speaking,
    candidate.analyser,
    candidate.speaking,
    reconnecting,
    dimension,
    prefersReducedMotion,
  ]);

  if (prefersReducedMotion) {
    return (
      <StaticOrb
        dimension={dimension}
        interviewerSpeaking={interviewer.speaking}
        candidateSpeaking={candidate.speaking}
        reconnecting={reconnecting}
        label={label}
      />
    );
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

function describeLabel(interviewerSpeaking: boolean, candidateSpeaking: boolean, reconnecting: boolean): string {
  if (reconnecting) return "Reconnecting";
  if (interviewerSpeaking && candidateSpeaking) return "Interviewer and you are both speaking";
  if (interviewerSpeaking) return "Interviewer speaking";
  if (candidateSpeaking) return "You are speaking";
  return "Interviewer listening";
}

// `prefers-reduced-motion: reduce` turns the live, amplitude-driven canvas
// off entirely rather than slowing it down: this renders instead, two
// nested soft gradients with no animation of any kind, that still answer
// the same two questions (is the interviewer talking, am I being heard)
// through color and intensity alone, updated only when those discrete
// states change.
function StaticOrb({
  dimension,
  interviewerSpeaking,
  candidateSpeaking,
  reconnecting,
  label,
}: {
  dimension: number;
  interviewerSpeaking: boolean;
  candidateSpeaking: boolean;
  reconnecting: boolean;
  label: string;
}) {
  const interviewerColor = reconnecting ? AMBER : interviewerSpeaking ? COPPER : NEUTRAL;
  const candidateColor = reconnecting ? AMBER : candidateSpeaking ? COPPER_LIGHT : NEUTRAL;
  const interviewerActive = interviewerSpeaking || reconnecting;
  const candidateActive = candidateSpeaking || reconnecting;

  return (
    <div
      role="img"
      aria-label={label}
      style={{
        width: dimension,
        height: dimension,
        borderRadius: "9999px",
        backgroundColor: STAGE,
        backgroundImage: `radial-gradient(circle at 50% 50%, ${withAlpha(interviewerColor, interviewerActive ? 0.5 : 0.16)} 0%, ${withAlpha(interviewerColor, 0)} 72%)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: dimension * 0.38,
          height: dimension * 0.38,
          borderRadius: "9999px",
          backgroundImage: `radial-gradient(circle at 50% 50%, ${withAlpha(candidateColor, candidateActive ? 0.95 : 0.28)} 0%, ${withAlpha(candidateColor, candidateActive ? 0.35 : 0.08)} 65%, transparent 100%)`,
        }}
      />
    </div>
  );
}

function withAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// A fixed function of angle and amplitude only — no time term. The `phase`
// argument gives each side's blob a different (but equally fixed) wobble
// pattern so the two don't just look like scaled copies of one shape; it is
// baked in per call site below, never advanced frame to frame. For a
// constant `level` this returns the exact same value on every call, which
// is what makes a held amplitude (including 0) render as a perfectly still
// outline rather than a shape that idles by breathing on its own.
function wobble(angle: number, phase: number): number {
  return (
    Math.sin(angle * 3 + phase) * 0.16 +
    Math.cos(angle * 5 - phase * 1.3) * 0.09 +
    Math.sin(angle * 2 + phase * 0.6) * 0.1
  );
}

function buildBlobPath(cx: number, cy: number, base: number, level: number, phase: number): Path2D {
  const path = new Path2D();
  for (let i = 0; i <= BLOB_SEGMENTS; i++) {
    const angle = (i / BLOB_SEGMENTS) * Math.PI * 2;
    const r = base * (1 + wobble(angle, phase) * level);
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    if (i === 0) path.moveTo(x, y);
    else path.lineTo(x, y);
  }
  path.closePath();
  return path;
}

// One glowing presence: an organic blob (flat at rest, since `level` is 0
// and wobble scales with it) filled with a soft center-to-edge gradient,
// with a canvas shadow for bloom, composited with "lighter" so two active
// presences blend into a brighter shared glow where they overlap rather
// than visually competing.
function drawBlob(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  base: number,
  level: number,
  color: string,
  active: boolean,
  phase: number,
): void {
  const path = buildBlobPath(cx, cy, base, level, phase);

  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, base * 1.25);
  gradient.addColorStop(0, withAlpha(color, active ? 0.95 : 0.3));
  gradient.addColorStop(0.55, withAlpha(color, active ? 0.5 : 0.14));
  gradient.addColorStop(1, withAlpha(color, 0));

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.shadowColor = withAlpha(color, active ? 0.5 : 0.18);
  ctx.shadowBlur = base * (active ? 0.85 : 0.35);
  ctx.fillStyle = gradient;
  ctx.fill(path);
  ctx.restore();
}

// The ambient wash behind both blobs: a large, very soft radial tint, never
// organic (plain circle), that leans toward whichever side(s) are active
// and settles to a neutral ivory tint when both are silent. Reads as the
// glow bleeding into the room rather than a separate decoration — its size
// and color both fall straight out of the same levels/flags as the blobs
// above it, so it goes exactly as still as they do.
function drawAmbientWash(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  color: string,
  alpha: number,
): void {
  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  gradient.addColorStop(0, withAlpha(color, alpha));
  gradient.addColorStop(1, withAlpha(color, 0));
  ctx.save();
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Pure canvas drawing, no React and no state of its own: called once per
// animation frame (from either side's independent loop) with both sides'
// current smoothed amplitudes (0..1 each). Nothing here depends on elapsed
// time, so constant levels (including 0, true silence on one or both
// sides) produce a perfectly still frame.
function drawOrbFrame(
  ctx: CanvasRenderingContext2D,
  dimension: number,
  interviewerLevel: number,
  candidateLevel: number,
  interviewerSpeaking: boolean,
  candidateSpeaking: boolean,
  reconnecting: boolean,
): void {
  ctx.clearRect(0, 0, dimension, dimension);
  const cx = dimension / 2;
  const cy = dimension / 2;

  const interviewerColor = reconnecting ? AMBER : interviewerSpeaking ? COPPER : NEUTRAL;
  const candidateColor = reconnecting ? AMBER : candidateSpeaking ? COPPER_LIGHT : NEUTRAL;
  const interviewerActive = interviewerSpeaking || reconnecting;
  const candidateActive = candidateSpeaking || reconnecting;

  const washColor = interviewerActive ? interviewerColor : candidateActive ? candidateColor : STAGE;
  const washLevel = Math.max(interviewerLevel, candidateLevel);
  drawAmbientWash(
    ctx,
    cx,
    cy,
    dimension * (0.46 + washLevel * 0.05),
    washColor,
    interviewerActive || candidateActive ? 0.22 : 0.14,
  );

  // Outer: the interviewer. Inner: the candidate's own voice, nested at the
  // center so speaking reads as speaking into the middle of this, not past
  // it. Different fixed `phase` values give the two blobs distinct wobble
  // patterns rather than one looking like a scaled copy of the other.
  drawBlob(ctx, cx, cy, dimension * 0.3, interviewerLevel, interviewerColor, interviewerActive, 0);
  drawBlob(ctx, cx, cy, dimension * 0.15, candidateLevel, candidateColor, candidateActive, 1.9);
}
