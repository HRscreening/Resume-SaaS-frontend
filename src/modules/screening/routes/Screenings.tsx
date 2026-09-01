import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useSearch, useNavigate } from "@tanstack/react-router";
import type { Screening } from "@/modules/screening/types/screening.type";
import { formatRelativeDate, ExactDate } from "@/utils/formatDate";
import { type Option, MenuButton, CustomMenuButton } from "@/modules/screening/components/shared/MenuButton";
import { Archive, ArchiveRestore, Trash, CircleCheck, Trash2, Plus } from 'lucide-react'
import { useScreeningsQuery } from "@/modules/screening/hooks/screening/queries/ListScreenings";
import type { ScreeningsSearchParams } from "@/modules/screening/types/searchSchema";
import { useScreeningMutation } from "@/modules/screening/hooks/screening/queries/screening.query";
import { archiveScreening, unarchiveScreening, deleteScreening } from "@/modules/screening/apis/screenings.api";
import { ConfirmScreeningDelete } from "@/modules/screening/components/Dialogs/ConfirmScreeningDelete";
import { ActionButton } from "@/modules/screening/components/shared/ActionButton";
import { useIsViewer } from "@/lib/useIsViewer";


const TableHeader = ["Title", "Applications", "Screened", "Last Accessed", "Action"];

type ScreeningType = "Active" | "Archived" | "Deleted";
export default function Screenings() {
  // Presentation only — the API refuses viewer writes regardless.
  const isViewer = useIsViewer();

  const navigate = useNavigate({ from: "/screenings" });
  const searchParams = useSearch({ strict: false }) as ScreeningsSearchParams;

  const params = {
    ...searchParams,
    search: searchParams.type ?? "Active",
  };

  const { data: screenings = [], isLoading } =
    useScreeningsQuery({
      ...params,
      type: params.type ?? "Active",
    });

  const archiveScreeningMutation = useScreeningMutation(archiveScreening, params);
  const unarchiveScreeningMutation = useScreeningMutation(unarchiveScreening, params);
  const deleteScreeningMutation = useScreeningMutation(deleteScreening, params);

  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [sIdToDelete, setSIdToDelte] = useState<string | null>(null);

  const handleDeleteScreening = (screeningId: string) => {
    setSIdToDelte(screeningId);
    setShowDeleteConfirmDialog(true);
  }


  const handleOptionClick = (type: any) => {
    navigate({
      search: (prev) => ({
        ...prev,
        type,
      }),
    });
  };


  const options = [
    { icon: <CircleCheck size={12} />, label: "Active" },
    { icon: <Archive size={12} />, label: "Archived" },
    // { icon: <Trash2 size={12} />, label: "Deleted" }
  ]

  const isArchiving = (id: string) =>
    archiveScreeningMutation.isPending &&
    archiveScreeningMutation.variables === id;


  const isUnarchiving = (id: string) =>
    unarchiveScreeningMutation.isPending &&
    unarchiveScreeningMutation.variables === id;

  const isDeleting = (id: string) =>
    deleteScreeningMutation.isPending &&
    deleteScreeningMutation.variables === id;


  // Render the page shell immediately. While the screenings query is in
  // flight, show skeleton rows in place of the empty-state — otherwise a
  // user with screenings would see "No screenings yet" briefly on first
  // load, which is misleading.
  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-5xl mx-auto">
      <div className="flex items-center mb-4 justify-between">
        <h1 className="text-xl sm:text-2xl font-bold text-[#0F0F0F]">Screenings</h1>
        <div className="flex items-center gap-3">
          <CustomMenuButton selectedOption={params.type} options={options} handleOptionClick={handleOptionClick} />
          {!isViewer && <Link
            to="/screenings/new"
            className="h-10 px-3 sm:px-4 bg-[#0F0F0F] text-white text-sm font-medium rounded-xl hover:bg-[#1C1C1C] transition-colors inline-flex items-center gap-2 shrink-0"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">New screening</span>
            <span className="sm:hidden">New</span>
          </Link>}
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-2xl border border-[#E8E5DF] overflow-hidden">
          <div className="divide-y divide-[#E8E5DF]">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="px-6 py-5 flex items-center gap-4 animate-pulse">
                <div className="h-3 w-48 bg-[#E8E5DF] rounded" />
                <div className="h-3 w-12 bg-[#E8E5DF] rounded ml-auto" />
                <div className="h-3 w-16 bg-[#E8E5DF] rounded" />
                <div className="h-5 w-20 bg-[#E8E5DF] rounded-md" />
              </div>
            ))}
          </div>
        </div>
      ) : screenings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E8E5DF] py-24 text-center">
          <div className="h-14 w-14 rounded-full bg-[#F5F3EE] flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#A0A0A0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6M8 13h8M8 17h5" />
            </svg>
          </div>
          <p className="text-base font-semibold text-[#0F0F0F] mb-2">No screenings yet</p>
          <p className="text-sm text-[#737373] mb-6 max-w-xs mx-auto">
            Upload your first batch of resumes and let AI rank your candidates.
          </p>
          <Link
            to="/screenings/new"
            className="inline-flex items-center h-10 px-5 bg-[#0F0F0F] text-white text-sm font-medium rounded-xl hover:bg-[#1C1C1C] transition-colors"
          >
            Create screening
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E8E5DF] overflow-hidden">
          <table className="w-full candidates-table">
            <thead>
              <tr className="border-b border-[#E8E5DF]">
                {
                  TableHeader.map((header, index) => (
                    <th key={index} className="px-6 py-3.5 text-left text-xs font-medium text-[#737373] uppercase tracking-wide">{header}</th>
                  ))
                }
                {/* <th className="px-6 py-3.5 text-left text-xs font-medium text-[#737373] uppercase tracking-wide">Title</th> */}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E5DF]">
              {screenings.map((s: Screening) => (
                <tr key={s.id} className="hover:bg-[#F5F3EE] transition-colors">

                  {/* Title */}
                  <td className="px-6 py-4">
                    <Link to="/screenings/$id" params={{ id: s.id }} search={{ tab: "Applications" }} className="text-sm font-medium text-[#0F0F0F] hover:underline cursor-pointer">
                      {s.title}
                    </Link>
                  </td>
                  {/* Count */}
                  <td className="px-6 py-4 text-sm text-[#404040] hidden md:table-cell">
                    {s.parsed_cnt + s.screened_cnt}
                  </td>

                  {/* Total Screened */}
                  <td className="px-6 py-4 text-sm text-[#404040] hidden md:table-cell">
                    {s.screened_cnt}
                  </td>



                  {/* Last Accesed */}
                  <td className="px-6 py-4 text-sm text-[#737373] hidden lg:table-cell">
                    {s.last_accessed_at ? formatRelativeDate(s.last_accessed_at) : "-"}
                  </td>

                  <td className="px-6 py-4 flex flex-row jus items-center gap-3">
                    {params.type !== "Archived" && <ActionButton title="Archive" compacted={true} icon={<Archive size={12} />} onClick={() => archiveScreeningMutation.mutate(s.id)} isLoading={isArchiving(s.id)} />
                    }
                    {s.archived_at &&
                      <>
                        <ActionButton title="Unarchive" compacted={true} icon={<ArchiveRestore size={12} />} onClick={() => unarchiveScreeningMutation.mutate(s.id)} isLoading={isUnarchiving(s.id)} />
                        <ActionButton title="Delete" compacted={true} icon={<Trash size={12} />} onClick={() => handleDeleteScreening(s.id)} isLoading={isDeleting(s.id)} />
                      </>
                    }
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ConfirmScreeningDelete
        open={showDeleteConfirmDialog}
        onClose={() => { setShowDeleteConfirmDialog(false); setSIdToDelte(null) }}
        onConfirm={() => {
          if (sIdToDelete) {
            deleteScreeningMutation.mutateAsync(sIdToDelete);

          }
        }}
      />
    </div>
  );
}
