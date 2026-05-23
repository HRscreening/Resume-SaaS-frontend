import { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { StagesMap } from "@/types";
import {
  STAGE_PALETTE,
  reindex,
  shadeColor,
  sortedStages,
  tintColor,
  type StageEntry,
} from "@/lib/stages";

// Editor-local row identity. Decoupled from the user-editable name so that
// typing in the input doesn't change the React key (which would remount the
// row and steal focus on every keystroke).
type DraftRow = StageEntry & { rid: string };

let _ridCounter = 0;
const newRid = () => `r${++_ridCounter}`;

function seedDraft(stages: StagesMap): DraftRow[] {
  return sortedStages(stages).map((s) => ({ ...s, rid: newRid() }));
}

interface StagesDialogProps {
  open: boolean;
  onClose: () => void;
  stages: StagesMap;
  onSave: (next: StagesMap) => Promise<void> | void;
}

export function StagesDialog({ open, onClose, stages, onSave }: StagesDialogProps) {
  const [draft, setDraft] = useState<DraftRow[]>(() => seedDraft(stages));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Row index that should auto-focus its name input on next render. Used to
  // jump focus into a freshly-added stage so the user can start typing
  // immediately without manually clearing "New stage".
  const [focusIndex, setFocusIndex] = useState<number | null>(null);

  // Re-seed draft whenever the dialog (re)opens so the user can't edit a
  // stale snapshot if upstream stages changed in the background.
  useEffect(() => {
    if (open) {
      setDraft(seedDraft(stages));
      setError(null);
    }
  }, [open, stages]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const ids = useMemo(() => draft.map((d) => d.rid), [draft]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = ids.indexOf(active.id as string);
    const newIndex = ids.indexOf(over.id as string);
    if (oldIndex < 0 || newIndex < 0) return;
    setDraft((prev) => arrayMove(prev, oldIndex, newIndex));
  }

  function updateAt(i: number, patch: Partial<StageEntry>) {
    setDraft((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }

  function removeAt(i: number) {
    setDraft((prev) => prev.filter((_, idx) => idx !== i));
  }

  function addStage() {
    const base = "New stage";
    let name = base;
    let n = 2;
    const taken = new Set(draft.map((d) => d.name));
    while (taken.has(name)) name = `${base} ${n++}`;
    setDraft((prev) => {
      setFocusIndex(prev.length);
      return [
        ...prev,
        { rid: newRid(), name, color: STAGE_PALETTE[prev.length % STAGE_PALETTE.length].color, index: prev.length + 1 },
      ];
    });
  }

  async function save() {
    setError(null);
    const names = draft.map((d) => d.name.trim());
    if (names.some((n) => !n)) {
      setError("Stage names can't be empty.");
      return;
    }
    if (new Set(names).size !== names.length) {
      setError("Stage names must be unique.");
      return;
    }
    if (draft.length === 0) {
      setError("Add at least one stage.");
      return;
    }
    if (draft.length > 20) {
      setError("You can have up to 20 stages.");
      return;
    }

    if (draft.some((d) => d.name.length > 50)) {
      setError("Stage names must be 50 characters or less.");
      return;
    }


    setSaving(true);
    try {
      await onSave(reindex(draft.map((d, i) => ({ ...d, name: d.name.trim(), index: i + 1 }))));
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save stages");
    } finally {
      setSaving(false);
    }
  }

  // Close on Escape, but not while a color popover is open — let the popover
  // swallow it. We handle that locally inside ColorSwatch.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/30 animate-in fade-in duration-150"
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-md rounded-2xl bg-white border border-[#E8E5DF] shadow-2xl animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8E5DF]">
          <div>
            <h2 className="text-sm font-semibold text-[#0F0F0F]">Edit stages</h2>
            <p className="text-xs text-[#737373] mt-0.5">Drag to reorder · click swatch to recolor</p>
          </div>
          <button
            onClick={onClose}
            className="h-7 w-7 rounded-lg hover:bg-[#F5F3EE] flex items-center justify-center text-[#737373]"
            aria-label="Close"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2 2l8 8M10 2l-8 8"/></svg>
          </button>
        </div>

        <div className="px-3 py-3 max-h-[60vh] overflow-y-auto">
          <div className="mx-1.5 mb-2.5 flex items-start gap-2 rounded-lg border border-[#F0DCC4] bg-[#FBF1E7] px-2.5 py-2 text-[11px] leading-snug text-[#7A4A1F]">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
              <circle cx="6" cy="6" r="5" /><path d="M6 5.5v3M6 3.5v.01" />
            </svg>
            <span>
              <span className="font-semibold">Order = pipeline progression.</span>{" "}
              Stages flow top → bottom, so candidates can only advance forward.
              For example, <span className="font-medium">Applied → Shortlisted → Interviewed → Hired</span> means a candidate in <em>Interviewed</em> can move to <em>Hired</em> but not back to <em>Applied</em>.
            </span>
          </div>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={ids} strategy={verticalListSortingStrategy}>
              <ul className="space-y-1">
                {draft.map((stage, i) => (
                  <SortableRow
                    key={ids[i]}
                    id={ids[i]}
                    stage={stage}
                    onNameChange={(name) => updateAt(i, { name })}
                    onColorChange={(color) => updateAt(i, { color })}
                    onRemove={() => removeAt(i)}
                    canRemove={draft.length > 1}
                    autoFocus={focusIndex === i}
                    onFocused={() => setFocusIndex(null)}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>

          <button
            type="button"
            onClick={addStage}
            className="mt-2 w-full flex items-center justify-center gap-1.5 h-9 rounded-lg border border-dashed border-[#D4D4D4] text-xs font-medium text-[#737373] hover:border-[#A0A0A0] hover:text-[#0F0F0F] hover:bg-[#FAFAF8] transition-colors"
          >
            <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 7h10M7 2v10" />
            </svg>
            Add stage
          </button>
        </div>

        <div className="flex items-center justify-between gap-2 px-5 py-3 border-t border-[#E8E5DF] bg-[#FAFAF8] rounded-b-2xl">
          <span className="text-xs text-red-600 truncate">{error}</span>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="h-8 px-3 text-xs font-medium text-[#404040] border border-[#D4D4D4] rounded-lg hover:bg-white disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="h-8 px-3 bg-[#0F0F0F] text-white text-xs font-medium rounded-lg hover:bg-[#1C1C1C] disabled:opacity-60 flex items-center gap-1.5"
            >
              {saving && <span className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin" />}
              Save changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SortableRow({
  id, stage, onNameChange, onColorChange, onRemove, canRemove, autoFocus, onFocused,
}: {
  id: string;
  stage: StageEntry;
  onNameChange: (name: string) => void;
  onColorChange: (color: string) => void;
  onRemove: () => void;
  canRemove: boolean;
  autoFocus?: boolean;
  onFocused?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!autoFocus) return;
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    el.select();
    onFocused?.();
    // run once when autoFocus flips true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFocus]);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-2 px-1.5 py-1.5 rounded-lg hover:bg-[#FAFAF8] transition-colors ${isDragging ? "bg-white shadow-lg ring-1 ring-[#E8E5DF]" : ""}`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
        className="h-7 w-5 flex items-center justify-center text-[#A0A0A0] hover:text-[#404040] cursor-grab active:cursor-grabbing shrink-0"
      >
        <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
          <circle cx="3" cy="3" r="1" /><circle cx="7" cy="3" r="1" />
          <circle cx="3" cy="7" r="1" /><circle cx="7" cy="7" r="1" />
          <circle cx="3" cy="11" r="1" /><circle cx="7" cy="11" r="1" />
        </svg>
      </button>

      <ColorSwatch color={stage.color} onChange={onColorChange} />

      <input
        ref={inputRef}
        type="text"
        value={stage.name}
        onChange={(e) => onNameChange(e.target.value)}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        className="flex-1 min-w-0 h-7 px-2 rounded-md text-xs font-medium text-[#0F0F0F] bg-transparent hover:bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#D4D4D4] transition-colors"
      />

      <span
        className="inline-flex items-center gap-1.5 h-6 px-2 rounded-full text-[11px] font-medium pointer-events-none"
        style={{ backgroundColor: tintColor(stage.color), color: shadeColor(stage.color) }}
      >
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: stage.color }} />
        {stage.name || "Untitled"}
      </span>

      <button
        type="button"
        onClick={onRemove}
        disabled={!canRemove}
        aria-label="Delete stage"
        className="h-7 w-7 rounded-md text-[#A0A0A0] hover:text-red-600 hover:bg-red-50 flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[#A0A0A0] transition-opacity"
      >
        <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 4h8M5.5 4V2.5h3V4M4 4l.5 8h5L10 4" />
        </svg>
      </button>
    </li>
  );
}

function ColorSwatch({ color, onChange }: { color: string; onChange: (color: string) => void }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  // Popover renders into a portal-style fixed layer so it isn't clipped or
  // mis-stacked by the sortable <li>'s transform. Coordinates are anchored
  // to the swatch button on open and recomputed on scroll/resize.
  useEffect(() => {
    if (!open) return;
    function place() {
      const r = btnRef.current?.getBoundingClientRect();
      if (!r) return;
      setPos({ left: r.left, top: r.bottom + 6 });
    }
    place();
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (popRef.current?.contains(t) || btnRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Choose color"
        title="Change color"
        className={`shrink-0 inline-flex items-center gap-1 h-7 pl-1 pr-1.5 rounded-md border transition-all ${open ? "border-[#0F0F0F] bg-white" : "border-[#E8E5DF] hover:border-[#A0A0A0] hover:bg-white"}`}
      >
        <span
          className="h-4 w-4 rounded-full border border-black/10"
          style={{ backgroundColor: color }}
        />
        <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="#737373" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2.5 4l2.5 2.5L7.5 4" />
        </svg>
      </button>
      {open && pos && (
        <div
          ref={popRef}
          style={{ position: "fixed", left: pos.left, top: pos.top, zIndex: 60 }}
          className="rounded-xl bg-white border border-[#E8E5DF] shadow-lg w-52 animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-[#A0A0A0]">
            Color
          </div>
          <div className="px-2 pb-2 grid grid-cols-6 gap-1.5">
          {STAGE_PALETTE.map((p) => (
            <button
              key={p.color}
              type="button"
              onClick={() => { onChange(p.color); setOpen(false); }}
              title={p.name}
              className={`h-6 w-6 rounded-full border transition-transform hover:scale-110 ${color.toLowerCase() === p.color.toLowerCase() ? "border-[#0F0F0F] ring-1 ring-[#0F0F0F]" : "border-black/10"}`}
              style={{ backgroundColor: p.color }}
            />
          ))}
          </div>
        </div>
      )}
    </>
  );
}
