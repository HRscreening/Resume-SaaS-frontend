import { useEffect, useRef } from "react";

import { createLevelLoop } from "./audioLevelLoop";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

// Warm brand accent (--copper / --copper-light in globals.css) — used here
// instead of a status-console green so a hands-free hour in this screen
// reads as a room, not a dashboard. Amber is kept for reconnecting only: a
// real warning state, distinct in kind from ordinary speaking.
const COPPER = "#C85A17";
const COPPER_LIGHT = "#E8753A";
const CHARCOAL = "#1C1C1C";
const AMBER = "#D97706";
const NEUTRAL = "#A3A3A3";
const STAGE = "#EAE7DF"; // --ivory-dark

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
  // The interviewer: rendered as the outer field, the presence surrounding
  // the candidate.
  interviewer: VoicePresence;
  // The candidate's own voice: rendered as the inner core, so speaking
  // reads as speaking to something rather than into a void — the whole
  // point of giving this side a tap at all. See useLocalAudioTrack for how
  // the candidate's MediaStreamTrack is obtained; see useAudioAnalyser
  // (reused unchanged for both sides) for why the tap cannot affect what
  // either party actually hears.
  candidate: VoicePresence;
  reconnecting: boolean;
  size: "large" | "compact";
}

// The candidate's one visual anchor for "is there a person on the other end
// of this, are they talking, and am I being heard." Two amplitude-driven
// presences share one shape: an outer field for the interviewer, an inner
// core for the candidate's own voice. Both are driven by real audio
// amplitude (useAudioAnalyser + createLevelLoop) on their own independent
// track, never by a timer — silence on a side renders as stillness on that
// side, because a shape that moves on its own schedule would tell the
// candidate something false about what is happening in the room.
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
// nested plain shapes with no animation of any kind, that still answer the
// same two questions (is the interviewer talking, am I being heard) through
// color and fill alone, updated only when those discrete states change.
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
  const outerColor = reconnecting ? AMBER : interviewerSpeaking ? COPPER : NEUTRAL;
  const outerFilled = interviewerSpeaking || reconnecting;
  const innerColor = reconnecting ? AMBER : CHARCOAL;
  const innerFilled = candidateSpeaking || reconnecting;

  return (
    <div
      role="img"
      aria-label={label}
      style={{
        width: dimension,
        height: dimension,
        borderRadius: "9999px",
        border: `2px solid ${outerColor}`,
        backgroundColor: outerFilled ? withAlpha(outerColor, 0.18) : STAGE,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: dimension * 0.32,
          height: dimension * 0.32,
          borderRadius: "9999px",
          border: `2px solid ${innerColor}`,
          backgroundColor: innerFilled ? innerColor : "transparent",
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

  // Ambient stage: a constant backdrop disc, never driven by state or
  // time. Purely a calm field for the two presences to sit in, so the orb
  // reads as a deliberately staged shape rather than one floating in blank
  // page background — including before either side has said a word.
  ctx.beginPath();
  ctx.fillStyle = withAlpha(STAGE, 0.55);
  ctx.arc(cx, cy, dimension * 0.48, 0, Math.PI * 2);
  ctx.fill();

  // Outer field: the interviewer. Soft glow rings plus a solid core, sized
  // directly off their amplitude, calmest when idle (small, faint).
  const outerColor = reconnecting ? AMBER : interviewerSpeaking ? COPPER : NEUTRAL;
  const outerActive = interviewerSpeaking || reconnecting;
  const outerBase = dimension * 0.27;

  for (let ring = 2; ring >= 1; ring--) {
    const radius = outerBase * (1 + ring * 0.18 + interviewerLevel * ring * 0.32);
    const alpha = (outerActive ? 0.16 : 0.08) / ring;
    ctx.beginPath();
    ctx.fillStyle = withAlpha(outerColor, alpha);
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  const outerCoreRadius = outerBase * (0.85 + interviewerLevel * 0.3);
  ctx.beginPath();
  ctx.fillStyle = withAlpha(outerColor, outerActive ? 0.85 : 0.4);
  ctx.arc(cx, cy, outerCoreRadius, 0, Math.PI * 2);
  ctx.fill();

  // Thin resting outline at the base radius, independent of amplitude, so
  // the outer field's "home" size stays legible even at its quietest.
  ctx.beginPath();
  ctx.strokeStyle = withAlpha(outerColor, 0.35);
  ctx.lineWidth = 1.5;
  ctx.arc(cx, cy, outerBase, 0, Math.PI * 2);
  ctx.stroke();

  // Inner core: the candidate's own voice, nested at the center. A solid
  // presence only while they are actually speaking, sized off their own
  // real amplitude — never the interviewer's. At rest it is an outline
  // only, the same "home size, no fill" convention the outer field already
  // uses for silence, so silence on this side reads as absence rather than
  // a shape that happens to not be moving.
  const innerColor = reconnecting ? AMBER : CHARCOAL;
  const innerBase = dimension * 0.13;
  const innerRadius = innerBase * (0.8 + candidateLevel * 0.45);

  if (candidateSpeaking || reconnecting) {
    ctx.beginPath();
    ctx.fillStyle = withAlpha(reconnecting ? AMBER : COPPER_LIGHT, 0.22);
    ctx.arc(cx, cy, innerRadius * 1.6, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.fillStyle = withAlpha(innerColor, 0.92);
    ctx.arc(cx, cy, innerRadius, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.strokeStyle = withAlpha(innerColor, 0.4);
    ctx.lineWidth = 1.5;
    ctx.arc(cx, cy, innerBase, 0, Math.PI * 2);
    ctx.stroke();
  }
}
