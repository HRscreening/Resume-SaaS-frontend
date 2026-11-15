import type { GuideDefinition } from "../types";
import { GUIDE_ENUM, GUIDE_TARGET } from "../constants";

const TARGET = GUIDE_TARGET[GUIDE_ENUM.APPLICATIONS];

export const ApplicationsGuide: GuideDefinition = {
  id: GUIDE_ENUM.APPLICATIONS,
  title: "Manage candidates for this job",
  description: "Add resumes, open job tools, and move candidates into screening.",
  version: 1,
  steps: [
    {
      target: TARGET.UPLOAD_CARD,
      title: "Add candidate resumes",
      content:
        "Upload resumes as a ZIP archive or as PDF, DOC, or DOCX files. They will appear in Applications so you can select who to screen.",
      placement: "bottom",
      skipScroll: true,
    },
    {
      target: TARGET.HEADER_ACTIONS,
      title: "Open job tools",
      content:
        "Open the saved job description or screening rubric, or post the job when you are ready to share it.",
      placement: "left",
      skipScroll: true,
    },
    {
      target: TARGET.SCREENING_TAB,
      title: "Review screening results",
      content:
        "After scoring candidates, switch to Screening to review their results and track their progress.",
      placement: "bottom",
      skipScroll: true,
    },
  ],
};

const TABLE_TARGET = GUIDE_TARGET[GUIDE_ENUM.APPLICATIONS_TABLE];

export const ApplicationsTableGuide: GuideDefinition = {
  id: GUIDE_ENUM.APPLICATIONS_TABLE,
  title: "Review your applications",
  description: "Select candidates, open their details, and start rubric-based screening.",
  version: 1,
  steps: [
    {
      target: TABLE_TARGET.ROW,
      title: "Open or select a candidate",
      content:
        "Click a candidate row to open their details and resume. Use the checkbox at the start of the row to select applicants for bulk actions such as Screen or Export.",
      placement: "bottom",
      skipScroll: true,
    },
    {
      target: TABLE_TARGET.ROW_ACTIONS,
      title: "Add notes and use more actions",
      content:
        "Use the row's action buttons to inspect resume details, add or view notes, or open the menu for more options.",
      placement: "left",
      skipScroll: true,
    },
    {
      target: TABLE_TARGET.SCREEN,
      title: "Score selected resumes",
      content:
        "Select candidates, then choose Screen in the action bar to score their resumes against this job's rubric. Results will appear in the Screening tab.",
      placement: "top",
      skipScroll: true,
    },
  ],
};
