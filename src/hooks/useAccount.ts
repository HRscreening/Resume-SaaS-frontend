import { useQuery } from "@tanstack/react-query";
import { getProfile } from "@/lib/api";
import type { AccountRole } from "@/types";

export function useAccount(): { role: AccountRole; canWrite: boolean; ownerName: string | null } {
  const { data } = useQuery({ queryKey: ["profile"], queryFn: getProfile, staleTime: 5 * 60_000 });
  const role = data?.active_account?.role ?? "owner";
  return { role, canWrite: role === "owner", ownerName: data?.active_account?.owner_name ?? null };
}
