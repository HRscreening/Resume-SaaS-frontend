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

export default function MenuItems() {
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
        <DropdownMenuItem>
          <Eye className="mr-2 h-4 w-4" />
          View Profile
        </DropdownMenuItem>

        <DropdownMenuItem>
          <Share2 className="mr-2 h-4 w-4" />
          Share Candidate
        </DropdownMenuItem>

        <DropdownMenuItem>
          <Download className="mr-2 h-4 w-4" />
          Download Resume
        </DropdownMenuItem>

        <DropdownMenuItem>
          <FileText className="mr-2 h-4 w-4" />
          Add Note
        </DropdownMenuItem>

        <DropdownMenuItem>
          <Star className="mr-2 h-4 w-4" />
          Star Candidate
        </DropdownMenuItem>

        <DropdownMenuItem>
          <Flag className="mr-2 h-4 w-4" />
          Flag Candidate
        </DropdownMenuItem>

        <DropdownMenuItem>
          <Archive className="mr-2 h-4 w-4" />
          Archive
        </DropdownMenuItem>

        <DropdownMenuItem className="text-destructive focus:text-destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}