import { request } from "@/lib/api";
import { StagesMap,HiringStage } from "@/modules/screening/types/screening.type";

export async function saveScreeningStages(
  screeningId: string,
  stages: StagesMap,
): Promise<string> {
  return request<string>(`/api/v1/screenings/${screeningId}/save-stages`, {
    method: "POST",
    body: JSON.stringify(stages),
  });
}

// Update a single candidate's current stage. Backend contract:
// POST /api/v1/scores/:scoreId/update-stage?new_stage=<stage>. Returns a
// plain string body.
export async function updateCandidateStage(
  scoreId: string,
  stage: HiringStage,
): Promise<string> {
  const qs = new URLSearchParams({ new_stage: stage });
  return request<string>(
    `/api/v1/scores/${scoreId}/update-stage?${qs.toString()}`,
    { method: "POST" },
  );
}
