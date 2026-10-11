import { cpp } from "@codemirror/lang-cpp";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { ensureSyntaxTree, syntaxTree, type LanguageSupport } from "@codemirror/language";
import type { EditorState } from "@codemirror/state";

import type { InterviewLanguage } from "@/lib/interviewApi";

interface EditorLanguage {
  support: () => LanguageSupport;
  indent: string;
  // Whether a parse error from this grammar is trustworthy enough to
  // underline. C++ is highlighted but not checked: its grammar cannot see
  // through macros and some templates, and a wrong red underline on code
  // that compiles is worse for a candidate than no underline at all.
  checksSyntax: boolean;
}

export const EDITOR_LANGUAGES: Record<InterviewLanguage, EditorLanguage> = {
  python: { support: python, indent: "    ", checksSyntax: true },
  javascript: { support: javascript, indent: "  ", checksSyntax: true },
  cpp: { support: cpp, indent: "    ", checksSyntax: false },
};

export interface SyntaxProblem {
  from: number;
  to: number;
}

const MAX_PROBLEMS = 10;
const PARSE_BUDGET_MS = 200;

// Where the grammar could not make sense of the code. The parser is
// error-tolerant: it marks what it had to skip or invent and carries on,
// and those marks are what this reports. It says where, never why; the
// real message comes from actually running the code.
export function syntaxProblems(state: EditorState): SyntaxProblem[] {
  const length = state.doc.length;
  const tree = ensureSyntaxTree(state, length, PARSE_BUDGET_MS) ?? syntaxTree(state);
  const problems: SyntaxProblem[] = [];
  tree.iterate({
    enter(node) {
      if (!node.type.isError || problems.length >= MAX_PROBLEMS) return;
      // An error node is often zero-width (something missing rather than
      // something wrong), and a zero-width range draws nothing.
      const from = Math.min(node.from, Math.max(0, length - 1));
      problems.push({ from, to: Math.min(length, Math.max(node.to, from + 1)) });
    },
  });
  return problems;
}
