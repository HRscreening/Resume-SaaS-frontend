import { Undo2, Redo2 } from "lucide-react";

interface Props {
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  disabled?: boolean;
}

export function RubricHistoryControls({ canUndo, canRedo, undo, redo, disabled }: Props) {
  const style = "inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-[#D9D6CE] bg-white px-2.5 text-sm font-medium text-[#3A3A3A] transition-colors hover:bg-[#F5F3EE] hover:border-[#C9C5BA] disabled:opacity-50 disabled:cursor-not-allowed sm:px-3.5";
  return (
    <div role="group" aria-label="Rubric edit history" className="flex gap-1.5">
      <button type="button" onClick={undo} disabled={disabled || !canUndo}
        aria-label="Undo" title="Undo (Ctrl/Cmd+Z)" className={style}>
        <Undo2 size={16} aria-hidden="true" /> <span className="hidden sm:inline">Undo</span>
      </button>
      <button type="button" onClick={redo} disabled={disabled || !canRedo}
        aria-label="Redo" title="Redo (Ctrl/Cmd+Shift+Z or Ctrl+Y)" className={style}>
        <Redo2 size={16} aria-hidden="true" /> <span className="hidden sm:inline">Redo</span>
      </button>
    </div>
  );
}
