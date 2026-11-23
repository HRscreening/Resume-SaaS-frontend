import ResumeTab from "@/modules/screening/components/shared/ResumeTab";
import { useState, useSyncExternalStore } from "react";
import { useParams } from "@tanstack/react-router";
import { format, parseISO } from "date-fns";
import {
  Eye,
  ExternalLink,
  Mail,
  Phone,
  Briefcase,
  GraduationCap,
  Wrench,
  FolderOpen,
  Award,
  Languages,
  Trophy,
} from "lucide-react";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Application } from "@/modules/screening/types/application.type";
import { resumeUploadService } from "@/lib/services/storage";
import { toast } from "sonner";
import { useScreeningDetailsNavigation } from "@/modules/screening/hooks/shared/useScreeningDetailNavigation";
import { AnalyticsEvent, useAnalytics } from "@/analytics";
import ProfileTab from "@/modules/screening/components/shared/profileTab";
import NotesTab from "@/modules/screening/components/shared/NotesTab";


/* ─── external-store (mirrors AnalysisSheet pattern) ─── */

const sheetListeners = new Set<() => void>();
let openResumeId: string | null = null;
function subscribe(fn: () => void) {
  sheetListeners.add(fn);
  return () => sheetListeners.delete(fn);
}
function notify() {
  sheetListeners.forEach((fn) => fn());
}
function getSnapshot() {
  return openResumeId;
}
export function setOpenAnalysisSheet(resume_id: string | null) {
  if (openResumeId === resume_id) return;
  openResumeId = resume_id;
  notify();
}
export function toggleAnalysisSheet(resume_id: string) {
  setOpenAnalysisSheet(openResumeId === resume_id ? null : resume_id);
}
export function useAnalysisSheetOpenId(): string | null {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}
export function useAnalysisSheetOpen() {
  return useSyncExternalStore(subscribe, getSnapshot, () => null) !== null;
}
export const ANALYSIS_SHEET_WIDTH = 600;

/* ─── helpers ─── */

export function formatExperience(years: number | null) {
  if (years == null) return "—";
  const totalMonths = Math.round(years * 12);
  const yrs = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  if (months === 0) return `${yrs} yrs`;
  return `${yrs} yrs ${months} mos`;
}

/** Safely format an ISO-8601 date string (timezone-aware via parseISO). */
export function formatDateSafe(dateStr: string | null, fmt = "MMM yyyy"): string {
  if (!dateStr) return "—";
  try {
    return format(parseISO(dateStr), fmt);
  } catch {
    try {
      return format(new Date(dateStr), fmt);
    } catch {
      return dateStr;
    }
  }
}

export const MAX_VISIBLE_SKILLS = 6;

type TabValue = "resume" | "profile" | "note";

type Tab = {
  title: string;
  value: TabValue;
}

const tabs: Tab[] = [
  { title: "Resume", value: "resume" },
  { title: "Profile", value: "profile" },
  { title: "Notes", value: "note" },
]

/* ─── main component ─── */

const InfoSheet = ({ candidate, open, disabled = false }: { candidate: Application, disabled: boolean, open: boolean }) => {

  const { id: screeningId } = useParams({ strict: false }) as { id: string };
  const { search, setAppId, setInfoTab } = useScreeningDetailsNavigation();
  const tab = search.infoTab ?? "resume";

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setAppId(null);
    }
  };


  return (
    <Sheet open={open} onOpenChange={handleOpenChange} modal={false}>
      <SheetTrigger asChild>
        <button
          title="View candidate info"
          type="button"
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            setAppId(candidate.id);
          }}
          className={`inline-flex items-center cursor-pointer justify-center ${open ? "invisible pointer-events-none" : ""}`}
          aria-label="View candidate info"
          aria-hidden={open}
        >
          <Eye className="text-[#A0A0A0] hover:text-[#C85A17] " size={16} />
        </button>
      </SheetTrigger>

      <SheetContent
        showOverlay={false}
        onClick={(e) => e.stopPropagation()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="w-full! sm:max-w-150! flex flex-col overflow-hidden p-0 z-40!"
      >
        <SheetHeader className="shrink-0 px-6 pt-6 border-b border-[#E8E5DF] pb-0">
          <SheetTitle className="text-sm font-semibold text-[#0F0F0F]">
            {/* Share sits in the drawer header, not inside the voice panel:
                        the resume report exists for EVERY candidate, so a candidate
                        who has not been called yet must still be shareable. */}
            <div className="flex items-center justify-between gap-2 mt-4">
              <div className="flex min-w-0 items-center justify-start gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {
                  tabs.map((t: Tab) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setInfoTab(t.value)}
                      disabled={tab === t.value}
                      className={`relative shrink-0 whitespace-nowrap px-3 py-2 text-sm font-semibold transition-colors cursor-pointer
                ${tab === t.value
                          ? "text-[#2563EB] border-b-2 border-[#2563EB]"
                          : "text-[#0F0F0F] border-b-2 border-transparent hover:text-[#2563EB]"
                        }`}
                    >
                      {t.title}
                    </button>
                  ))
                }
              </div>
            </div>
          </SheetTitle>
        </SheetHeader>



        {
          tab === "profile" && candidate && (<div className="min-h-0 flex-1 overflow-y-auto">
            {!candidate ? <div className="px-6 py-10 text-center">Profile not available. Please Contact Support for more information.</div>
              :
              <ProfileTab candidate={candidate} />
            }
          </div>)
        }
        {/* Keep the iframe mounted so switching tabs preserves the loaded document. */}
        <div className={tab === "resume" ? "flex min-h-0 flex-1 flex-col" : "hidden"}>
          <ResumeTab screeningId={screeningId} resumePath={candidate.resume_url} />
        </div>
        {/* Notes */}
        {
          tab === "note" && (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-6 py-2">
              <NotesTab screeningId={screeningId} resumeId={candidate.id} />
            </div>
          )
        }
      </SheetContent>
    </Sheet >
  );
};

export default InfoSheet;

/* ─── sub-components ─── */

export function InfoRow({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href?: string;
}) {
  const content = href ? (
    <a href={href} className="text-sm font-medium text-[#0F0F0F] hover:text-[#C85A17] transition-colors text-right">
      {value}
    </a>
  ) : (
    <span className="text-sm font-medium text-[#0F0F0F] text-right">{value}</span>
  );

  return (
    <div className="flex items-center justify-between py-2 border-b border-[#E8E5DF] last:border-b-0">
      <span className="flex items-center gap-2 text-sm text-[#737373]">
        {icon}
        {label}
      </span>
      {content}
    </div>
  );
}



