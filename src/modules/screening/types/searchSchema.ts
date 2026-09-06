/**
 * You can use this file to define the search params schema for the screening module.
 * 
 * This schema will be used to validate the search params in the URL and to generate the search form.
 * 
 * Validation is done using the zod library, which is a TypeScript-first schema declaration and validation library.
 * 
 * Validating the search params in the URL is important to ensure that the params are valid and to prevent errors in the application.
 * 
 * You can as much validation as you want, but keep in mind that the more validation you add, the more complex the search params will be.
 * 
 * This is to ensure that backend and frontend are in sync and that the search params are valid.
 * 
 */

import { z } from "zod";


export const sectionTabs = ["Applications", "Screening"] as const;


export const searchSchema = z.object({
  tab: z.enum(sectionTabs).default("Applications"),
  saved: z.union([z.literal(1), z.literal("1")]).optional(),
});


export type SearchSchema = z.infer<typeof searchSchema>;


//--------------------- Screenings Page Search Params ----------------------

const ScreeningSections = ["Active", "Archived"] as const;

export const screeningsSearchSchema = z.object({
  search: z.string().optional(),
  type: z.enum(ScreeningSections).default("Active"),
})


export type ScreeningsSearchParams = z.infer<typeof screeningsSearchSchema>;








// -------------------------------- Single Screening Page Search Params --------------------------------


export const DEFAULT_MIN = 0;
// Upper bound of the experience slider, and therefore the widest range it can
// express. At 20 this silently hid every candidate with a longer career, which
// on senior roles is most of them.
export const DEFAULT_MAX = 50;
export const DEFAULT_RANGE: RangeFilter = { min: DEFAULT_MIN, max: DEFAULT_MAX };

export const rangeFilterSchema = z.object({
  min: z.number().optional(),
  max: z.number().optional(),
});

export type RangeFilter = z.infer<typeof rangeFilterSchema>;

const sortRuleSchema = <T extends readonly [string, ...string[]]>(
  fields: T
) =>
  z.object({
    field: z.enum(fields),
    direction: z.enum(["asc", "desc"]),
  });

export type SortRule<T extends readonly [string, ...string[]]> = z.infer<ReturnType<typeof sortRuleSchema<T>>>;

// ---------------- Common ----------------

export const ResumeSections = ["Active", "Archived"] as const;


// UI Search Params only used for navigation and UI state, not sent to backend
// So store such params in a separate schema to avoid sending them to backend by mistake
export const uiSearchSchema = z.object({
  tab: z.enum(sectionTabs).default("Applications"),
  saved: z.union([z.literal(1), z.literal("1")]).optional(),
  appId: z.string().optional(), // for opening the analysis sheet for a specific candidate
  screenId: z.string().optional(), // for opening the analysis sheet for a specific candidate
  analysisTab: z.enum(["profile","scorecard","voice"]).optional(), // for opening the analysis sheet for a specific candidate
});

export type UISearchParams = z.infer<typeof uiSearchSchema>;


// ---------------- Applications Search Params ----------------



export const APPLICATION_FILTER_KEYS = [
    "appName",
    "appCurrentRole",
    "appCurrentCompany",
    "skills",
    "education",
    "workEx",
    "project",
    "certification",
    "achivement",
    "pors",
    "lang",
] as const;

export type ApplicationFilterKey = (typeof APPLICATION_FILTER_KEYS)[number];



const ApplicationsSortableFields = ["experience", "name"] as const;

export type ApplicationsSortableFields = (typeof ApplicationsSortableFields)[number];

// Application Filters (only update if backend filters are updated)
export const applicationSearchSchema = z.object({
  appType: z.enum(ResumeSections).default("Active"),
  
  
  appSort: z.array(sortRuleSchema(ApplicationsSortableFields)).optional(),
  appExperience: rangeFilterSchema.default({ min: DEFAULT_MIN, max: DEFAULT_MAX }),
  
  // I think we move these to a common schema so that we can use them in both applications and screening search params
  // Currently we are providing this feature only in application tab
  appName: z.string().optional(),
  appCurrentRole: z.string().optional(),
  appCurrentCompany: z.string().optional(),
  education: z.string().optional(),
  workEx : z.string().optional(),
  project: z.string().optional(),
  certification: z.string().optional(),
  achivement: z.string().optional(),
  pors : z.string().optional(),
  skills : z.string().optional(),
  lang : z.string().optional(),

});


export type ApplicationsSearchParams = z.infer<typeof applicationSearchSchema>;




// ---------------- Screening Search Params ----------------

export type MatchTierId = "strong" | "potential" | "risky" | "poor";

const ScreeningSortableFields = ["overall_score","experience", "candidate_name", "stage"] as const;

const ScreeningSortRuleSchema = z.object({
  field: z.union([z.enum(ScreeningSortableFields), z.string().regex(/^cat:.+$/),]),
  direction: z.enum(["asc", "desc"]),
});

export type ScreeningSortRule = z.infer<typeof ScreeningSortRuleSchema>;


// Screening Filters (only update if backend filters are updated)
export const screeningSearchSchema = z.object({
  
  screenStage: z.array(z.string()).optional(),
  screenType: z.enum(ResumeSections).default("Active"),
  screenMatch: z.array(z.enum(["strong", "potential", "risky", "poor"])).optional(),
  screenOverallScore: rangeFilterSchema.optional(),
  screenCategoryScores: z.record(z.string(), rangeFilterSchema).optional(),
  screenSort: z.array(ScreeningSortRuleSchema).default([{direction: "desc",field: "overall_score",}]),


  // Along with this , same filters as applicationSearchSchema are also sent to backend for screening search, so we can't merge as they need to be separate for both tabs

  
  // I think we move these to a common schema so that we can use them in both applications and screening search params
  // Currently we are providing this feature only in application tab
  //using s prefix to avoid confusion with application search params
  sExp: rangeFilterSchema.default({ min: DEFAULT_MIN, max: DEFAULT_MAX }),
  sName: z.string().optional(),
  sCurrentRole: z.string().optional(),
  sCurrentCompany: z.string().optional(),
  sEducation: z.string().optional(),
  sWorkEx : z.string().optional(),
  sProject: z.string().optional(),
  sCertification: z.string().optional(),
  sAchivement: z.string().optional(),
  sPors : z.string().optional(),
  sSkills : z.string().optional(),
  sLang : z.string().optional(),
});


export type ScreeningSearchParams = z.infer<typeof screeningSearchSchema> ;



export const Screening_FILTER_KEYS = [
    "sName",
    "sCurrentRole",
    "sCurrentCompany",
    "sSkills",
    "sEducation",
    "sWorkEx",
    "sProject",
    "sCertification",
    "sAchivement",
    "sPors",
    "sLang",
] as const;

export type ScreeningFilterKey = (typeof Screening_FILTER_KEYS)[number];




// ---------------------- Merged Search Params for individual screening page ----------------------
// .merge depricated
export const screeningDetailsSearchSchema = uiSearchSchema.merge(applicationSearchSchema).merge(screeningSearchSchema);
export type ScreeningDetailsSearchParams = z.infer<typeof screeningDetailsSearchSchema>;