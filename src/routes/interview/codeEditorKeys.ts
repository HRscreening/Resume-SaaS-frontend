// Tab handling for the plain-textarea code editor (see CodeEditor.tsx for why
// there is no real editor library here). A bare <textarea> moves focus on
// Tab by default, which makes writing indented code unusable, so this
// intercepts it and edits the value directly instead.

const INDENT = "  "; // two spaces, matching Python's own convention

export interface TextEdit {
  value: string;
  selectionStart: number;
  selectionEnd: number;
}

function lineStart(value: string, offset: number): number {
  const lastNewline = value.lastIndexOf("\n", offset - 1);
  return lastNewline + 1;
}

function lineEnd(value: string, offset: number): number {
  const nextNewline = value.indexOf("\n", offset);
  return nextNewline === -1 ? value.length : nextNewline;
}

// Plain Tab with the cursor collapsed (no selection): insert the indent at
// the cursor, same as typing any other character.
function insertAtCursor(value: string, cursor: number): TextEdit {
  const next = value.slice(0, cursor) + INDENT + value.slice(cursor);
  const pos = cursor + INDENT.length;
  return { value: next, selectionStart: pos, selectionEnd: pos };
}

// Tab with text selected, possibly spanning several lines: indent every
// touched line, growing the selection to match so another Tab press keeps
// indenting the same block.
function indentLines(value: string, start: number, end: number): TextEdit {
  const from = lineStart(value, start);
  const to = lineEnd(value, end);
  const block = value.slice(from, to);
  const indented = block
    .split("\n")
    .map((line) => INDENT + line)
    .join("\n");
  const next = value.slice(0, from) + indented + value.slice(to);
  return {
    value: next,
    selectionStart: start + INDENT.length,
    selectionEnd: end + INDENT.length * (block.split("\n").length),
  };
}

// Shift+Tab: remove one indent's worth of leading whitespace from every
// line the selection (or just the cursor's line) touches.
function outdentLines(value: string, start: number, end: number): TextEdit {
  const from = lineStart(value, start);
  const to = lineEnd(value, end);
  const block = value.slice(from, to);
  let firstLineRemoved = 0;
  const outdented = block
    .split("\n")
    .map((line, index) => {
      const match = /^( {1,2}|\t)/.exec(line);
      if (!match) return line;
      if (index === 0) firstLineRemoved = match[0].length;
      return line.slice(match[0].length);
    })
    .join("\n");
  const next = value.slice(0, from) + outdented + value.slice(to);
  const removedBeforeStart = Math.min(firstLineRemoved, start - from);
  return {
    value: next,
    selectionStart: Math.max(from, start - removedBeforeStart),
    selectionEnd: Math.max(from, end - (block.length - outdented.length) + removedBeforeStart),
  };
}

// Applies Tab/Shift+Tab to a textarea's current value and selection. Returns
// null when the key is not Tab, so callers can fall through to default
// textarea behaviour for every other key.
export function applyTabKey(
  key: string,
  shiftKey: boolean,
  value: string,
  selectionStart: number,
  selectionEnd: number,
): TextEdit | null {
  if (key !== "Tab") return null;
  if (shiftKey) return outdentLines(value, selectionStart, selectionEnd);
  if (selectionStart === selectionEnd) return insertAtCursor(value, selectionStart);
  return indentLines(value, selectionStart, selectionEnd);
}
