import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ConfirmScreeningDeleteProps {
  open: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmScreeningDelete({
  open,
  onConfirm,
  onClose,
}: ConfirmScreeningDeleteProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete this screening?</DialogTitle>

        </DialogHeader>

        <div className="rounded-xl border border-[#E8E5DF] bg-[#FAFAF8] p-4">
          <p className="text-sm leading-6 text-gray-700">
            Applications, screening results, and other data associated with
            this screening will no longer appear in your active screenings.
          </p>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>

          <Button onClick={onConfirm} className="bg-[#C85A17] text-white hover:bg-[#B85A17]">
            Delete screening
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}