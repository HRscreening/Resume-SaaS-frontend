import { useEffect, useState } from "react";

import PinnedQuestion from "../PinnedQuestion";
import type { PresenceState } from "../presenceState";
import SpokenStage from "../SpokenStage";

// Development only (mounted at /dev/spoken-stage): the spoken stage with no
// LiveKit room. A silent oscillator, amplitude-modulated like speech,
// stands in for both voices so the orb can be judged moving; nothing is
// connected to the speakers.
function useFakeVoice(): AnalyserNode | null {
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  useEffect(() => {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const node = ctx.createAnalyser();
    node.fftSize = 256;
    osc.frequency.value = 180;
    osc.connect(gain).connect(node);
    osc.start();
    const timer = window.setInterval(() => {
      // Syllable-ish bursts with short pauses.
      gain.gain.setTargetAtTime(Math.random() < 0.2 ? 0 : 0.05 + Math.random() * 0.2, ctx.currentTime, 0.04);
    }, 140);
    const resume = () => ctx.resume();
    window.addEventListener("pointerdown", resume);
    setAnalyser(node);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("pointerdown", resume);
      osc.stop();
      ctx.close();
    };
  }, []);
  return analyser;
}

const STATES: (PresenceState | "reconnecting")[] = ["speaking", "listening", "thinking", "reconnecting"];

export default function SpokenStagePreview() {
  const voice = useFakeVoice();
  const [state, setState] = useState<PresenceState | "reconnecting">("speaking");
  const [camera, setCamera] = useState(true);
  const [question, setQuestion] = useState(true);
  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: "#F5F3EE" }}>
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 text-xs">
        {STATES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setState(s)}
            className={`h-7 px-3 rounded-lg border ${s === state ? "bg-[#0F0F0F] text-white" : "bg-white"}`}
          >
            {s}
          </button>
        ))}
        <label className="ml-3 flex items-center gap-1">
          <input type="checkbox" checked={camera} onChange={(e) => setCamera(e.target.checked)} /> camera
        </label>
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={question} onChange={(e) => setQuestion(e.target.checked)} /> question
        </label>
        <span className="text-[#737373]">click once to start the fake voice</span>
      </div>
      <SpokenStage
        presenceState={state === "reconnecting" ? "listening" : state}
        reconnecting={state === "reconnecting"}
        interviewerAnalyser={voice}
        candidateAnalyser={voice}
        showSelfView={camera}
      >
        {question && (
          <PinnedQuestion
            prompt="You've been tasked with designing and implementing a RAG system to enhance the accuracy and relevance of an LLM application. Describe your approach, including the key components, design choices you'd make, and challenges you anticipate."
            secondsRemaining={612}
            warning={false}
            timerActive
          />
        )}
      </SpokenStage>
    </div>
  );
}
