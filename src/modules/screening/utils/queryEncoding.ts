import { ScreeningSearchParams as ScoredResumeSearchFilterSchema, ApplicationsSearchParams } from "@/modules/screening/types/searchSchema";
import { Application } from "../types/application.type";

const DEFAULT_LIMIT: number = 30;


/**
 * A small utility that translates the Screening tab's URL search state into the query parameters expected by the backend API.
 */
export function buildScreeningQuery(
  // params: ScoredResumeSearchFilterSchema,
  cursor?: string | null,
  limit: number = DEFAULT_LIMIT
): URLSearchParams {

  const qs = new URLSearchParams();

  qs.set("limit", String(limit));

  if (cursor) {
    qs.set("cursor", cursor);
  }

  // qs.set("type", params.screenType);


  // if (params.screenStage && params.screenStage.length > 0) {
  //   qs.set("stage", params.screenStage.join(","));
  // }

  // if (params.screenMatch && params.screenMatch.length > 0) {
  //   qs.set("match", params.screenMatch.join(","));
  // }

  // if (params.screenOverallScore?.min !== undefined) {
  //   qs.set("overall_min", String(params.screenOverallScore.min),);
  // }

  // if (params.screenOverallScore?.max !== undefined) {
  //   qs.set(
  //     "overall_max",
  //     String(params.screenOverallScore.max),
  //   );
  // }

  // if (params.screenCategoryScores) {

  //   for (const [name, range] of Object.entries(
  //     params.screenCategoryScores,
  //   )) {
  //     if (range.min !== undefined) {
  //       qs.set(
  //         `cat_min[${name}]`,
  //         String(range.min),
  //       );
  //     }

  //     if (range.max !== undefined) {
  //       qs.set(
  //         `cat_max[${name}]`,
  //         String(range.max),
  //       );
  //     }
  //   }
  // }

  // if (params.screenSort.length > 0) {
  //   qs.set(
  //     "sort",
  //     params.screenSort
  //       .map(
  //         ({ field, direction }) =>
  //           `${field}:${direction}`,
  //       )
  //       .join(","),
  //   );
  // }




  return qs;
}


export function buildScreeningFiltersBody(
  params: ScoredResumeSearchFilterSchema
) {
  return {
    // Screening filters
    stages:
      params.screenStage?.length
        ? params.screenStage
        : undefined,

    match:
      params.screenMatch?.length
        ? params.screenMatch
        : undefined,

    overall_score:
      params.screenOverallScore
        ? {
            min: params.screenOverallScore.min,
            max: params.screenOverallScore.max,
          }
        : undefined,

    category_scores:
      params.screenCategoryScores &&
      Object.keys(params.screenCategoryScores).length > 0
        ? params.screenCategoryScores
        : undefined,

    sort:
      params.screenSort?.length
        ? params.screenSort
        : undefined,

    // Application filters
    name: params.sName || undefined,

    type: params.screenType,

    exp:
      params.sExp || undefined,

    current_role:
      params.sCurrentRole || undefined,

    current_company:
      params.sCurrentCompany || undefined,

    education:
      params.sEducation || undefined,

    work_ex:
      params.sWorkEx || undefined,

    project:
      params.sProject || undefined,

    certification:
      params.sCertification || undefined,

    achivement:
      params.sAchivement || undefined,

    pors:
      params.sPors || undefined,

    skills: params.sSkills || undefined,

    lang: params.sLang || undefined,
  };
}



/**
 * A small utility that translates the Screening tab's URL search state into the query parameters expected by the backend API.
 */
// For simple query parameters like cursor and limit, we can use this function to build the query string for fetching applications.
// export function buildApplicationQuery(
//   cursor?: string | null,
//   limit: number = DEFAULT_LIMIT
// ): URLSearchParams {
//   const qs = new URLSearchParams();

//   qs.set("limit", String(limit));

//   if (cursor) {
//     qs.set("cursor", cursor);
//   }

//   return qs;
// }

export function buildApplicationQuery(
  // params: ApplicationsSearchParams,
  cursor?: string | null,
  limit: number = DEFAULT_LIMIT
): URLSearchParams {
  const qs = new URLSearchParams();

  qs.set("limit", String(limit));

  if (cursor) {
    qs.set("cursor", cursor);
  }

  // qs.set("type", params.appType);

  // if (params.appName) {
  //   qs.set("name", params.appName);
  // }

  // if (params.appSort?.length) {
  //   qs.set("sort", JSON.stringify(params.appSort));
  // }

  // if (params.appExperience) {
  //   qs.set("exp", JSON.stringify(params.appExperience));
  // }

  // if (params.appCurrentRole) {
  //   qs.set("current_role", params.appCurrentRole);
  // }

  // if (params.appCurrentCompany) {
  //   qs.set("current_company", params.appCurrentCompany);
  // }

  // if (params.education) {
  //   qs.set("education", params.education);
  // }

  // if (params.workEx) {
  //   qs.set("work_ex", params.workEx);
  // }

  // if (params.project) {
  //   qs.set("project", params.project);
  // }

  // if (params.certification) {
  //   qs.set("certification", params.certification);
  // }

  // if (params.achivement) {
  //   qs.set("achievement", params.achivement);
  // }

  // if (params.pors) {
  //   qs.set("pors", params.pors);
  // }

  // if (params.skills) {
  //   qs.set("skills", JSON.stringify(params.skills));
  // }

  // if (params.lang) {
  //   qs.set("lang", JSON.stringify(params.lang));
  // }

  return qs;
}


export function buildApplicationFiltersBody(params: ApplicationsSearchParams) {

  return {
    name: params.appName || undefined,
    type: params.appType,

    sort: params.appSort?.length
      ? params.appSort
      : undefined,

    exp: params.appExperience || undefined,

    current_role: params.appCurrentRole || undefined,
    current_company: params.appCurrentCompany || undefined,
    education: params.education || undefined,
    work_ex: params.workEx || undefined,
    project: params.project || undefined,
    certification: params.certification || undefined,
    achivement: params.achivement || undefined,
    pors: params.pors || undefined,
    skills: params.skills || undefined,
    lang: params.lang || undefined,
  };
}