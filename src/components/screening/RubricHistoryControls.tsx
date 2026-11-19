import { Undo2, Redo2 } from "lucide-react";

interface Props {
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  disabled?: boolean;
}

export function RubricHistoryControls({ canUndo, canRedo, undo, redo, disabled }: Props) {
  const style = "inline-flex h-9 items-center gap-2 rounded-lg border border-[#D4D4D4] px-3 text-sm text-[#404040] hover:bg-[#F5F3EE] disabled:opacity-40 disabled:cursor-not-allowed";
  return (
    <div role="group" aria-label="Rubric edit history" className="flex gap-2 mb-3">
      <button type="button" onClick={undo} disabled={disabled || !canUndo}
        title="Undo (Ctrl/Cmd+Z)" className={style}>
        <Undo2 size={15} aria-hidden="true" /> Undo
      </button>
      <button type="button" onClick={redo} disabled={disabled || !canRedo}
        title="Redo (Ctrl/Cmd+Shift+Z or Ctrl+Y)" className={style}>
        <Redo2 size={15} aria-hidden="true" /> Redo
      </button>
    </div>
  );
}
