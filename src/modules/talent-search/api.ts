import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { request, requestFormData } from "@/lib/api";
import type { Answer, Coverage, SearchResult, SearchSpec, TalentSearch } from "./types";

const BASE = "/api/v1/talent-search";
const POLL_MS = 2000;

export const talentSearchKeys = {
  search: (id: string) => ["talent-search", id] as const,
  results: (id: string) => ["talent-search", id, "results"] as const,
  coverage: (id: string) => ["talent-search", id, "coverage"] as const,
};

export function createSearch(input: { jdText?: string; file?: File | null }): Promise<TalentSearch> {
  const form = new FormData();
  if (input.file) form.append("file", input.file);
  else form.append("jd_text", input.jdText ?? "");
  return requestFormData<TalentSearch>(BASE, form);
}

export function useSearch(id: string | undefined) {
  return useQuery({
    queryKey: talentSearchKeys.search(id ?? ""),
    queryFn: () => request<TalentSearch>(`${BASE}/${id}`),
    enabled: !!id,
    refetchInterval: (query) => (query.state.data?.status === "searching" ? POLL_MS : false),
  });
}

export function useResults(id: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: talentSearchKeys.results(id ?? ""),
    queryFn: () => request<SearchResult[]>(`${BASE}/${id}/results`),
    enabled: !!id && enabled,
  });
}

export function useCoverage(id: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: talentSearchKeys.coverage(id ?? ""),
    queryFn: () => request<Coverage>(`${BASE}/${id}/coverage`),
    enabled: !!id && enabled,
  });
}

function useSearchMutation<TVars>(id: string | undefined, fn: (vars: TVars) => Promise<TalentSearch>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (search) => qc.setQueryData(talentSearchKeys.search(id ?? search.id), search),
  });
}

export function useAnswer(id: string | undefined) {
  return useSearchMutation(id, (answers: Answer[]) =>
    request<TalentSearch>(`${BASE}/${id}/answers`, { method: "POST", body: JSON.stringify({ answers }) }),
  );
}

export function useUpdateSpec(id: string | undefined) {
  return useSearchMutation(id, (spec: SearchSpec) =>
    request<TalentSearch>(`${BASE}/${id}/spec`, { method: "PUT", body: JSON.stringify(spec) }),
  );
}

export function useStartSearch(id: string | undefined) {
  return useSearchMutation<void>(id, () => request<TalentSearch>(`${BASE}/${id}/search`, { method: "POST" }));
}

export function useVerdict(searchId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { resultId: string; verdict: SearchResult["verdict"]; reason?: string }) =>
      request(`${BASE}/results/${vars.resultId}/verdict`, {
        method: "POST",
        body: JSON.stringify({ verdict: vars.verdict, reason: vars.reason }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: talentSearchKeys.results(searchId ?? "") }),
  });
}
