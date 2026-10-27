import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { EditorView } from "@codemirror/view";
import { tags as t } from "@lezer/highlight";

// The editor's look: the interview room's own warm-neutral palette rather
// than a stock CodeMirror theme, so the pane reads as one surface.
const chrome = EditorView.theme({
  "&": {
    height: "100%",
    fontSize: "13px",
    backgroundColor: "#FFFFFF",
    color: "#0F0F0F",
  },
  "&.cm-focused": { outline: "none" },
  ".cm-scroller": {
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    lineHeight: "1.6",
    overflow: "auto",
  },
  ".cm-content": { padding: "10px 0", caretColor: "#0F0F0F" },
  ".cm-gutters": {
    backgroundColor: "#FAF9F5",
    color: "#A3A3A3",
    border: "none",
    borderRight: "1px solid #E8E5DF",
  },
  ".cm-lineNumbers .cm-gutterElement": { padding: "0 10px 0 12px", minWidth: "36px" },
  ".cm-activeLine": { backgroundColor: "#F5F3EE80" },
  ".cm-activeLineGutter": { backgroundColor: "#F0EEE6", color: "#404040" },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection": {
    backgroundColor: "#FBE3D2",
  },
  ".cm-matchingBracket, &.cm-focused .cm-matchingBracket": {
    backgroundColor: "#E7F5EC",
    outline: "1px solid #BBE5CA",
  },
  // The line a failed run stopped on.
  ".cm-run-error-line": { backgroundColor: "#FEE2E2" },
  ".cm-run-error-gutter": { backgroundColor: "#FCA5A5", color: "#7F1D1D" },
  ".cm-tooltip": {
    border: "1px solid #E5E1D8",
    borderRadius: "8px",
    backgroundColor: "#FFFFFF",
    fontSize: "12px",
  },
  ".cm-diagnostic": { padding: "6px 10px" },
});

const colors = HighlightStyle.define([
  { tag: [t.keyword, t.controlKeyword, t.moduleKeyword, t.operatorKeyword, t.definitionKeyword], color: "#9A3412" },
  { tag: [t.string, t.special(t.string), t.regexp], color: "#166534" },
  { tag: [t.number, t.bool, t.null, t.atom], color: "#1D4ED8" },
  { tag: [t.comment, t.lineComment, t.blockComment, t.docString], color: "#8A8A8A", fontStyle: "italic" },
  { tag: [t.function(t.variableName), t.function(t.propertyName), t.function(t.definition(t.variableName))], color: "#6D28D9" },
  { tag: [t.className, t.typeName, t.namespace], color: "#0F766E" },
  { tag: [t.self, t.special(t.variableName)], color: "#9A3412" },
  { tag: [t.operator, t.punctuation, t.bracket], color: "#525252" },
  { tag: t.invalid, color: "#B91C1C" },
]);

export const editorTheme = [chrome, syntaxHighlighting(colors)];
