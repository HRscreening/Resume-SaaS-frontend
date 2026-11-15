import { guideRegistry } from "./guideRegistry";
import {GuideProvider} from "./GuideProvider"
import { useGuide } from "./useGuide";

// import { dashboardGuide } from "./definitions/dashboard";
import {
  OnBoarding,
  NewJob,
  BuildWithAI,
  RubricReview,
  ApplicationsGuide,
  ApplicationsTableGuide,
  ScreeningGuide,
  ScreeningCandidatesGuide,
} from "./definitions";

guideRegistry.registerMany([
  OnBoarding,
  NewJob,
  BuildWithAI,
  RubricReview,
  ApplicationsGuide,
  ApplicationsTableGuide,
  ScreeningGuide,
  ScreeningCandidatesGuide,
]);

export { guideRegistry,GuideProvider,useGuide };
export * from "./types";