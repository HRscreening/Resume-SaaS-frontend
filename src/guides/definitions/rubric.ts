import type { GuideDefinition } from "../types";
import { GUIDE_ENUM, GUIDE_TARGET } from "../constants";

const TARGET = GUIDE_TARGET[GUIDE_ENUM.RUBRIC];

export const RubricReview: GuideDefinition = {
  id: GUIDE_ENUM.RUBRIC,
  title: "Refine your screening rubric",
  description:
    "Make the criteria clear and relevant so candidate scores reflect what matters for this role.",
  version: 1,
  steps: [
    {
      target: TARGET.SUBCATEGORY,
      title: "Define the criterion",
      content:
        "Set whether the criterion is a Must Have or an External Signal, then give it a clear name and describe the evidence to look for. Specific criteria help keep screening focused and consistent.",
      placement: "bottom",
      skipScroll: true,
    },
    {
      target: TARGET.SUBCATEGORY_WEIGHT,
      title: "Set its importance",
      content:
        "Choose Low, Moderate, Standard, Important, or Critical. Higher importance gives this criterion more influence on the category score.",
      placement: "bottom",
      skipScroll: true,
    },
    {
      target: TARGET.SUBCATEGORY_ADD,
      title: "Add another criterion",
      content:
        "Choose Add subcategory to include another skill or qualification in this category. Then name it, describe the evidence, and set its importance. Each category supports up to five criteria.",
      placement: "bottom",
      skipScroll: false,
    },
    {
      target: TARGET.SUBCATEGORY_DELETE,
      title: "Remove an irrelevant criterion",
      content:
        "Delete a criterion that does not apply to this role. Keep the rubric focused on requirements that help you evaluate candidates.",
      placement: "left",
      skipScroll: false,
    },
  ],
};
