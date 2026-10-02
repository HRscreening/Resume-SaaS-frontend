import { useRef } from "react";

import { applyTabKey } from "./codeEditorKeys";

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

// A plain <textarea>, deliberately: no code editor library (CodeMirror,
// Monaco) is installed in this project, and pulling one in for a single
// editable field is the "2MB dependency the candidate waits on" the brief
// explicitly warns against. A monospace textarea with real Tab handling
// covers what a candidate needs to write and read back a short solution.
export default function CodeEditor({ value, onChange, disabled }: CodeEditorProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    const el = ref.current;
    if (!el) return;
    const edit = applyTabKey(
      event.key,
      event.shiftKey,
      el.value,
      el.selectionStart,
      el.selectionEnd,
    );
    if (!edit) return;
    event.preventDefault();
    onChange(edit.value);
    // The value prop update above re-renders async; the selection must be
    // restored after that, once the DOM actually reflects the new value.
    requestAnimationFrame(() => {
      el.setSelectionRange(edit.selectionStart, edit.selectionEnd);
    });
  }

  return (
    <textarea
      ref={ref}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={handleKeyDown}
      spellCheck={false}
      autoCapitalize="off"
      autoCorrect="off"
      aria-label="Code editor"
      className="w-full h-full min-h-[280px] resize-none rounded-lg border border-[#D4D4D4] bg-white px-3 py-2 text-sm font-mono leading-relaxed text-[#0F0F0F] outline-none focus:border-[#C85A17] disabled:opacity-60 disabled:bg-[#F5F3EE]"
      placeholder="Write your solution here."
    />
  );
}
