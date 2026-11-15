
import type { GuideDefinition } from "../types";
import { GUIDE_ENUM, GUIDE_TARGET } from "../constants";


const TARGET = GUIDE_TARGET[GUIDE_ENUM.ONBOARDING];



export const OnBoarding: GuideDefinition = {
  id: GUIDE_ENUM.ONBOARDING,
  title: "Your hiring workspace",
  description: "Create a role, then return to it to manage candidates and screening.",

  version: 1,

  steps: [
    {
      target: TARGET.NEW_JOBS,
      title: "Create a job",
      content:
        "Start a workspace for a new role. Next, add its job description and build the criteria you'll use to screen candidates.",
      placement: "bottom",
    },
    {
      target: TARGET.EXISTING_JOBS,
      title: "Return to a job",
      content:
        "Open a saved role to manage its applications, review screening results, and continue your hiring process.",
      placement: "right",
    },
    
    // {
    //   target: TARGET.GENERATE_JD,
    //   title: "Generate Job Description",
    //   content:
    //     "Enter the required details below and let our AI agent build your job description.",
    // },
  ],
};

