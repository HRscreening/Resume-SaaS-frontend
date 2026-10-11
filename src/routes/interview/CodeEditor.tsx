import { useEffect, useRef } from "react";
import { closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { bracketMatching, indentOnInput, indentUnit } from "@codemirror/language";
import { type Diagnostic, linter, lintGutter } from "@codemirror/lint";
import { Compartment, EditorState } from "@codemirror/state";
import {
  drawSelection,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
} from "@codemirror/view";

import type { InterviewLanguage } from "@/lib/interviewApi";
import { EDITOR_LANGUAGES, syntaxProblems } from "./codeEditorLanguage";
import { runErrorLine, setRunErrorLine } from "./codeEditorRunError";
import { editorTheme } from "./codeEditorTheme";

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: InterviewLanguage;
  // 1-based line the last run failed on, or null. Cleared by the next edit.
  errorLine: number | null;
}

// Long enough that an underline does not flicker under a line still being
// typed, short enough to be there when the candidate looks up.
const LINT_DELAY_MS = 600;

function languageExtensions(language: InterviewLanguage) {
  const config = EDITOR_LANGUAGES[language];
  return [
    config.support(),
    indentUnit.of(config.indent),
    config.checksSyntax
      ? [
          linter(
            (view): Diagnostic[] =>
              syntaxProblems(view.state).map((problem) => ({
                ...problem,
                severity: "error",
                // The parser notices a mistake where it stops making sense,
                // which is often the line after the one that caused it.
                message:
                  "This does not parse. Look for a missing bracket, colon or quote on this line or just above it.",
              })),
            { delay: LINT_DELAY_MS },
          ),
          // A one-character underline is easy to miss; the gutter dot is not.
          lintGutter(),
        ]
      : [],
  ];
}

// A real code editor (CodeMirror 6): colours, line numbers, bracket
// matching, auto-indent, and an underline where the code does not parse.
// A candidate writing a solution while talking should not also be the
// syntax checker. It replaced a plain textarea, which had none of that.
export default function CodeEditor({ value, onChange, language, errorLine }: CodeEditorProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const languageSlot = useRef(new Compartment());
  // The view is created once; it must always call the latest onChange.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!hostRef.current) return;
    const view = new EditorView({
      parent: hostRef.current,
      state: EditorState.create({
        doc: value,
        extensions: [
          lineNumbers(),
          highlightActiveLine(),
          highlightActiveLineGutter(),
          history(),
          drawSelection(),
          indentOnInput(),
          bracketMatching(),
          closeBrackets(),
          keymap.of([...closeBracketsKeymap, ...defaultKeymap, ...historyKeymap, indentWithTab]),
          languageSlot.current.of(languageExtensions(language)),
          runErrorLine,
          editorTheme,
          EditorView.contentAttributes.of({ "aria-label": "Code editor", spellcheck: "false" }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) onChangeRef.current(update.state.doc.toString());
          }),
        ],
      }),
    });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // Created once. `value`, `language` and `errorLine` are synced into the
    // live view by the effects below rather than by rebuilding it, which
    // would drop the cursor and the undo history on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The source changed from outside the editor: a language switch swapping
  // in that language's scaffold, or a restored buffer.
  useEffect(() => {
    const view = viewRef.current;
    if (!view || view.state.doc.toString() === value) return;
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } });
  }, [value]);

  useEffect(() => {
    viewRef.current?.dispatch({
      effects: languageSlot.current.reconfigure(languageExtensions(language)),
    });
  }, [language]);

  useEffect(() => {
    viewRef.current?.dispatch({ effects: setRunErrorLine.of(errorLine) });
  }, [errorLine]);

  return (
    <div
      ref={hostRef}
      className="h-full w-full overflow-hidden rounded-lg border border-[#D4D4D4] bg-white focus-within:border-[#C85A17]"
    />
  );
}
