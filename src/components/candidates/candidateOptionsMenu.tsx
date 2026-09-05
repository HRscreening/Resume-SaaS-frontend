import type { ComponentType } from "react";
import { EllipsisVertical } from "lucide-react";
import {
  Eye,
  Share2,
  Download,
  FileText,
  Star,
  Flag,
  Archive,
  Trash2,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Button } from "@/components/ui/Button";
import { useAccount } from "@/hooks/useAccount";

interface CandidateMenuOption {
  label: string;
  icon: ComponentType<{ className?: string }>;
  destructive?: boolean;
}

// Read items (View Profile/Download Resume) mixed with write items (Share/
// Add Note/Star/Flag/Archive/Delete). A viewer only gets the read items,
// matching the filtering pattern in
// src/modules/screening/components/Screening/CandidatesTable.tsx.
const menuOptions: CandidateMenuOption[] = [
  { label: "View Profile", icon: Eye },
  { label: "Share Candidate", icon: Share2 },
  { label: "Download Resume", icon: Download },
  { label: "Add Note", icon: FileText },
  { label: "Star Candidate", icon: Star },
  { label: "Flag Candidate", icon: Flag },
  { label: "Archive", icon: Archive },
  { label: "Delete", icon: Trash2, destructive: true },
];

const WRITE_MENU_LABELS = new Set([
  "Share Candidate",
  "Add Note",
  "Star Candidate",
  "Flag Candidate",
  "Archive",
  "Delete",
]);

export default function MenuItems() {
  const { canWrite } = useAccount();
  const visibleMenuOptions = canWrite
    ? menuOptions
    : menuOptions.filter((o) => !WRITE_MENU_LABELS.has(o.label));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 rounded-full"
        >
          <EllipsisVertical className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-48">
        {visibleMenuOptions.map(({ label, icon: Icon, destructive }) => (
          <DropdownMenuItem
            key={label}
            className={destructive ? "text-destructive focus:text-destructive" : undefined}
          >
            <Icon className="mr-2 h-4 w-4" />
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
