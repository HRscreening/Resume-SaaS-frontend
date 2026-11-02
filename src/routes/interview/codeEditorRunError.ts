import { RangeSetBuilder, StateEffect, StateField } from "@codemirror/state";
import { Decoration, type DecorationSet, EditorView, GutterMarker, gutterLineClass } from "@codemirror/view";

// Marks the line a failed run stopped on, so the candidate does not have to
// count down to "line 14" by eye. It is set from outside (the run result)
// and cleared by the first edit: once the code has changed, the line number
// a previous run reported is no longer a fact about it.
export const setRunErrorLine = StateEffect.define<number | null>();

const lineDecoration = Decoration.line({ class: "cm-run-error-line" });

class ErrorGutterMarker extends GutterMarker {
  elementClass = "cm-run-error-gutter";
}
const gutterMarker = new ErrorGutterMarker();

const errorLineField = StateField.define<number | null>({
  create: () => null,
  update(line, transaction) {
    for (const effect of transaction.effects) {
      if (effect.is(setRunErrorLine)) return effect.value;
    }
    return transaction.docChanged ? null : line;
  },
});

function lineStart(view: EditorView["state"], line: number | null): number | null {
  if (line === null || line < 1 || line > view.doc.lines) return null;
  return view.doc.line(line).from;
}

export const runErrorLine = [
  errorLineField,
  EditorView.decorations.compute([errorLineField], (state): DecorationSet => {
    const from = lineStart(state, state.field(errorLineField));
    return from === null ? Decoration.none : Decoration.set([lineDecoration.range(from)]);
  }),
  gutterLineClass.compute([errorLineField], (state) => {
    const builder = new RangeSetBuilder<GutterMarker>();
    const from = lineStart(state, state.field(errorLineField));
    if (from !== null) builder.add(from, from, gutterMarker);
    return builder.finish();
  }),
];
