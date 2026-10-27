import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getProfile, updateProfile } from "@/lib/api";
import { Subscription } from "@/modules/subscription/Subscription";
import { Check, Mail, Building, User as UserIcon } from "lucide-react";

function getInitials(name?: string | null, email?: string | null): string {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0][0].toUpperCase();
  }
  if (email) return email[0].toUpperCase();
  return "?";
}

export default function Profile() {
  const queryClient = useQueryClient();
  const profileQuery = useQuery({ queryKey: ["profile"], queryFn: getProfile, staleTime: 60_000 });
  const profile = profileQuery.data;

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [fieldsHydrated, setFieldsHydrated] = useState(false);

  useEffect(() => {
    if (profile && !fieldsHydrated) {
      setName(profile.full_name ?? "");
      setCompany(profile.company_name ?? "");
      setFieldsHydrated(true);
    }
  }, [profile, fieldsHydrated]);

  const isDirty =
    name.trim() !== (profile?.full_name ?? "").trim() ||
    company.trim() !== (profile?.company_name ?? "").trim();

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      const updated = await updateProfile({
        full_name: name.trim() || undefined,
        company_name: company.trim() || undefined,
      });
      queryClient.setQueryData(["profile"], updated);
      setName(updated.full_name ?? "");
      setCompany(updated.company_name ?? "");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (profileQuery.isLoading) {
    return (
      <div className="p-4 sm:p-6 md:p-8 flex items-center justify-center min-h-96">
        <div className="h-6 w-6 rounded-full border-2 border-[#0F0F0F] border-t-transparent animate-spin" />
      </div>
    );
  }

  const initials = getInitials(profile?.full_name, profile?.email);

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-[#0F0F0F]">Profile & Account</h1>
        <p className="text-sm text-[#737373] mt-1">
          Manage your personal profile details and subscription.
        </p>
      </div>

      {saveError && (
        <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {saveError}
        </div>
      )}

      {/* Cards Layout: Row on wide screens (lg+), column on smaller screens */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Profile Card */}
        <div className="bg-white rounded-2xl border border-[#E8E5DF] p-6 sm:p-7 shadow-xs">
          {/* Profile User Info Header */}
          <div className="flex items-center gap-4 pb-6 border-b border-[#E8E5DF]">
            <div className="h-12 w-12 rounded-full bg-[#0F0F0F] text-white flex items-center justify-center font-semibold text-base shrink-0 select-none">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold text-[#0F0F0F] truncate">
                {profile?.full_name || "Account Profile"}
              </h2>
              <p className="text-xs text-[#737373] truncate">{profile?.email ?? ""}</p>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-5 pt-5">
            {/* Email - Read-only */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="email" className="flex items-center gap-1.5 text-xs font-semibold text-[#0F0F0F] uppercase tracking-wider">
                  <Mail className="w-3.5 h-3.5 text-[#737373]" />
                  Email address
                </label>
                <span className="text-[11px] font-medium text-[#737373] bg-[#F5F3EE] px-2 py-0.5 rounded border border-[#E8E5DF]">
                  Non-editable
                </span>
              </div>
              <input
                id="email"
                type="email"
                value={profile?.email ?? ""}
                disabled
                readOnly
                className="w-full h-10 px-3.5 rounded-xl border border-[#E8E5DF] bg-[#F9F8F6] text-[#737373] text-sm cursor-not-allowed select-all"
              />
              <p className="mt-1.5 text-xs text-[#A0A0A0]">Email is associated with your login account and cannot be modified.</p>
            </div>

            {/* Editable fields: Name and Company */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="flex items-center gap-1.5 text-xs font-semibold text-[#0F0F0F] uppercase tracking-wider mb-1.5">
                  <UserIcon className="w-3.5 h-3.5 text-[#737373]" />
                  Full name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Smith"
                  className="w-full h-10 px-3.5 rounded-xl border border-[#D4D4D4] bg-white text-[#0F0F0F] text-sm placeholder:text-[#A0A0A0] focus:outline-none focus:ring-2 focus:ring-[#0F0F0F]/10 focus:border-[#0F0F0F] transition-all"
                />
              </div>

              <div>
                <label htmlFor="company" className="flex items-center gap-1.5 text-xs font-semibold text-[#0F0F0F] uppercase tracking-wider mb-1.5">
                  <Building className="w-3.5 h-3.5 text-[#737373]" />
                  Company
                </label>
                <input
                  id="company"
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Acme Corp"
                  className="w-full h-10 px-3.5 rounded-xl border border-[#D4D4D4] bg-white text-[#0F0F0F] text-sm placeholder:text-[#A0A0A0] focus:outline-none focus:ring-2 focus:ring-[#0F0F0F]/10 focus:border-[#0F0F0F] transition-all"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={saving || !isDirty}
                  className="h-9 px-4 bg-[#0F0F0F] text-white text-xs font-medium rounded-xl hover:bg-[#1C1C1C] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-xs"
                >
                  {saving && (
                    <span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  )}
                  {saving ? "Saving…" : "Save changes"}
                </button>
                {saved && (
                  <span className="flex items-center gap-1 text-xs text-green-700 font-medium">
                    <Check className="w-4 h-4 text-green-600" />
                    Changes saved
                  </span>
                )}
              </div>
              {!isDirty && !saving && (
                <span className="text-xs text-[#A0A0A0]">All changes saved</span>
              )}
            </div>
          </form>
        </div>

        {/* Subscription Component */}
        <Subscription />
      </div>
    </div>
  );
}
