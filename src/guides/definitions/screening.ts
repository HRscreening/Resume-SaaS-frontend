import type { GuideDefinition } from "../types";
import { GUIDE_ENUM, GUIDE_TARGET } from "../constants";

const TARGET = GUIDE_TARGET[GUIDE_ENUM.SCREENING];

export const ScreeningGuide: GuideDefinition = {
  id: GUIDE_ENUM.SCREENING,
  title: "Start screening candidates",
  description: "Find out how to score new candidates and set up interview rounds.",
  version: 1,
  steps: [
    {
      target: TARGET.EMPTY_STATE,
      title: "Add and score candidates",
      content:
        "Choose Start Screening to open Applications. Upload resumes, select the applicants, and choose Screen; their rubric-based results will appear here.",
      placement: "bottom",
      skipScroll: true,
    },
    {
      target: TARGET.HEADER_ACTIONS,
      title: "Set up interview rounds",
      content:
        "Choose Voice round or Interview round to configure an evaluation for this job. Use View Calls to review voice-call activity.",
      placement: "bottom",
      skipScroll: true,
    },
  ],
};

const CANDIDATES_TARGET = GUIDE_TARGET[GUIDE_ENUM.SCREENING_CANDIDATES];

export const ScreeningCandidatesGuide: GuideDefinition = {
  id: GUIDE_ENUM.SCREENING_CANDIDATES,
  title: "Review screened candidates",
  description: "Understand candidate scores, interview results, and hiring stages.",
  version: 1,
  steps: [
    {
      target: CANDIDATES_TARGET.CANDIDATE_ROW,
      title: "Open candidate score analysis",
      content:
        "Click a candidate row to open their score analysis, criterion-level breakdown, and supporting evidence. Review these details before deciding on next steps.",
      placement: "bottom",
      skipScroll: true,
    },
    {
      target: CANDIDATES_TARGET.SCORE,
      title: "Interpret the score",
      content:
        "This score from 0 to 100 summarizes the candidate's match to the job rubric. Use it to prioritize review, then check the candidate's evidence before making a hiring decision.",
      placement: "bottom",
      skipScroll: true,
    },
    {
      target: CANDIDATES_TARGET.VOICE_HEADER,
      title: "Voice-screen results",
      content:
        "After you set up a Voice round and conduct a screen, the candidate's voice-screen status and result appear in this column.",
      placement: "bottom",
      skipScroll: true,
    },
    {
      target: CANDIDATES_TARGET.INTERVIEW_HEADER,
      title: "Interview progress",
      content:
        "This column tracks interview progress and results after you configure an Interview round and invite candidates.",
      placement: "bottom",
      skipScroll: true,
    },
    {
      target: CANDIDATES_TARGET.STAGE,
      title: "Track hiring progress",
      content:
        "Choose the candidate's current hiring stage here so your team can see where they are in the process.",
      placement: "left",
      skipScroll: true,
    },
    {
      target: CANDIDATES_TARGET.AI_CALL,
      title: "Start AI voice calls",
      content:
        "Select up to 10 candidates, then choose AI Call to start voice screens. Call status and results appear under Voice.",
      placement: "top",
      skipScroll: true,
    },
  ],
};
