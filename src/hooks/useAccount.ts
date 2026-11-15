import { useProfile } from "@/hooks/useProfile";
import type { AccountRole } from "@/types";

export function useAccount(): { role: AccountRole; canWrite: boolean; ownerName: string | null } {
  const { data } = useProfile();
  const role = data?.active_account?.role ?? "owner";
  return { role, canWrite: role === "owner", ownerName: data?.active_account?.owner_name ?? null };
}
