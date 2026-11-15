
import type { GuideDefinition } from "../types";
import { GUIDE_ENUM, GUIDE_TARGET } from "../constants";


const TARGET = GUIDE_TARGET[GUIDE_ENUM.NEW_JOB];



export const NewJob: GuideDefinition = {
  id: GUIDE_ENUM.NEW_JOB,
  title: "Set up a new job",
  description: "Add a role description and create criteria for consistent candidate screening.",

  version: 1,

  steps:[
    {
      target: TARGET.JOB_TITLE,
      title: "Name the role",
      content:
        "Enter a clear job title so your team can identify this opening throughout the workspace.",
      placement: "bottom",
    },
    {
      target: TARGET.JD_INPUT_BTNS,
      title: "Add a job description",
      content:
        "Upload a file, paste an existing description, or choose Build with AI. The description gives the screening rubric generator context about the role.",
    },
    {
      target: TARGET.GENERATE_RUBRIC,
      title: "Generate screening criteria",
      content:
        "Create a draft rubric from the job description. Review and refine its criteria before creating the job.",
    },
  ],
};

const TARGET2 = GUIDE_TARGET[GUIDE_ENUM.BUILD_JD_AI];

export const BuildWithAI : GuideDefinition = {
  id: GUIDE_ENUM.BUILD_JD_AI,
  title: "Create a job description with AI",
  description: "Provide role context, guide the draft, and review it before use.",
  steps: [
    {
      target: TARGET2.JOB_DETAILS,
      title: "Give the AI role context",
      content:
        "Complete the required company and role details. Optional location, team, and skills help tailor the draft to your opening.",
      placement: "left",
    },
    {
      target: TARGET2.PROMPT_INPUT,
      title: "Add optional instructions",
      content:
        "Describe details you want emphasized, such as seniority, responsibilities, or must-have skills. After generation, use this field to request refinements.",
      placement: "bottom",
    },
    {
      target: TARGET2.GENERATE_JD,
      title: "Generate a draft",
      content:
        "Create a first draft from the job details and your instructions. Review and edit it before continuing.",
      placement: "bottom",
    },
  ],
};