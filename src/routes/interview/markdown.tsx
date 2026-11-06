// A minimal, dependency-free markdown renderer for `statement_md`.
//
// Why hand-rolled instead of a library: nothing markdown-shaped was already
// a dependency here (checked package.json and the lockfile before writing
// this), and the two usual choices are a bad trade for a one-field renderer
// that is read, not authored, by this app:
//   - `react-markdown` pulls the unified/remark/rehype stack, far more
//     weight than a question statement needs.
//   - `marked`/`markdown-it` render to an HTML string, which then wants
//     `dangerouslySetInnerHTML` to display — an injection surface this
//     component has no reason to open for server-sourced text.
// This renders straight to React elements, so there is no HTML string at
// any point and nothing to sanitize. It covers the subset a question
// statement actually uses: headings, paragraphs, bold/italic, inline code,
// fenced code blocks, links, ordered/unordered lists, and simple inline TeX
// math ($2 \le N \le 10^4$), which the question writer often uses for
// constraints. It is not a CommonMark implementation and is not meant to
// become one.

import { Fragment } from "react";

type MathPart = string | { sup: string } | { sub: string };

type InlineToken =
  | { kind: "text"; text: string }
  | { kind: "code"; text: string }
  | { kind: "math"; parts: MathPart[] }
  | { kind: "bold"; children: InlineToken[] }
  | { kind: "italic"; children: InlineToken[] }
  | { kind: "link"; text: string; href: string };

// The TeX a constraint line uses, as the characters a reader expects.
// Any other command is dropped and its braced argument kept as text.
const TEX_SYMBOLS: Record<string, string> = {
  le: "≤", leq: "≤", ge: "≥", geq: "≥", ne: "≠", neq: "≠", lt: "<", gt: ">",
  times: "×", cdot: "·", pm: "±", infty: "∞", dots: "…", ldots: "…", cdots: "…",
  in: "∈", to: "→", rightarrow: "→", log: "log", min: "min", max: "max",
};

// One $...$ span as text with superscripts and subscripts: 10^{9} and 10^9
// both become 10 with a raised 9.
function mathParts(tex: string): MathPart[] {
  const plain = tex
    .replace(/\\([a-zA-Z]+)/g, (_, name: string) => TEX_SYMBOLS[name] ?? "")
    .replace(/\\[,;:! ]/g, " ");
  const parts: MathPart[] = [];
  const pushText = (text: string) => {
    const clean = text.replace(/[{}]/g, "");
    if (!clean) return;
    const last = parts[parts.length - 1];
    if (typeof last === "string") parts[parts.length - 1] = last + clean;
    else parts.push(clean);
  };
  const script = /([\^_])(?:\{([^}]*)\}|([-+]?\w+))/g;
  let at = 0;
  for (const m of plain.matchAll(script)) {
    pushText(plain.slice(at, m.index));
    const body = (m[2] ?? m[3]).replace(/[{}]/g, "");
    parts.push(m[1] === "^" ? { sup: body } : { sub: body });
    at = (m.index ?? 0) + m[0].length;
  }
  pushText(plain.slice(at));
  return parts;
}

// Scans one line (or paragraph of joined lines) for inline markdown: `code`,
// **bold**, *italic*, [text](href). Unmatched markers fall back to literal
// text rather than throwing, since a question statement is not guaranteed
// to be well-formed markdown and a candidate must never see a crash here.
function tokenizeInline(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  let i = 0;
  while (i < text.length) {
    const rest = text.slice(i);

    const code = /^`([^`]+)`/.exec(rest);
    if (code) {
      tokens.push({ kind: "code", text: code[1] });
      i += code[0].length;
      continue;
    }

    // Pandoc's rule: the opening $ is followed by a non-space and the
    // closing $ preceded by one and not followed by a digit, so "$5 and
    // $10" stays a pair of prices.
    const math = /^\$([^\s$](?:[^$]*[^\s$])?)\$(?!\d)/.exec(rest);
    if (math) {
      tokens.push({ kind: "math", parts: mathParts(math[1]) });
      i += math[0].length;
      continue;
    }

    const bold = /^(\*\*|__)(.+?)\1/.exec(rest);
    if (bold) {
      tokens.push({ kind: "bold", children: tokenizeInline(bold[2]) });
      i += bold[0].length;
      continue;
    }

    const italic = /^(\*|_)([^*_]+?)\1/.exec(rest);
    if (italic) {
      tokens.push({ kind: "italic", children: tokenizeInline(italic[2]) });
      i += italic[0].length;
      continue;
    }

    const link = /^\[([^\]]*)\]\(([^)\s]+)\)/.exec(rest);
    if (link) {
      tokens.push({ kind: "link", text: link[1], href: link[2] });
      i += link[0].length;
      continue;
    }

    // No marker matched at this position: consume one plain-text run up to
    // the next character that could start a marker, so runs of ordinary
    // text are not split into one token per character.
    const next = rest.slice(1).search(/[`*_[$]/);
    const plainLen = next === -1 ? rest.length : next + 1;
    const plain = rest.slice(0, plainLen);
    const last = tokens[tokens.length - 1];
    if (last?.kind === "text") {
      last.text += plain;
    } else {
      tokens.push({ kind: "text", text: plain });
    }
    i += plainLen;
  }
  return tokens;
}

function renderInlineTokens(tokens: InlineToken[], keyPrefix: string): React.ReactNode[] {
  return tokens.map((token, index) => {
    const key = `${keyPrefix}-${index}`;
    switch (token.kind) {
      case "text":
        return <Fragment key={key}>{token.text}</Fragment>;
      case "code":
        return (
          <code key={key} className="px-1 py-0.5 rounded bg-[#F0EEE6] text-[0.85em] font-mono">
            {token.text}
          </code>
        );
      case "math":
        return (
          <span key={key}>
            {token.parts.map((part, partIndex) =>
              typeof part === "string" ? (
                <Fragment key={partIndex}>{part}</Fragment>
              ) : "sup" in part ? (
                <sup key={partIndex}>{part.sup}</sup>
              ) : (
                <sub key={partIndex}>{part.sub}</sub>
              ),
            )}
          </span>
        );
      case "bold":
        return <strong key={key}>{renderInlineTokens(token.children, key)}</strong>;
      case "italic":
        return <em key={key}>{renderInlineTokens(token.children, key)}</em>;
      case "link":
        // Only http(s) and mailto are rendered as a real link. Anything
        // else (a stray "javascript:" or malformed scheme in untrusted-ish
        // content) degrades to plain text rather than a clickable href.
        if (/^(https?:|mailto:)/i.test(token.href)) {
          return (
            <a
              key={key}
              href={token.href}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 text-[#C85A17]"
            >
              {token.text || token.href}
            </a>
          );
        }
        return <Fragment key={key}>{token.text}</Fragment>;
      default:
        return null;
    }
  });
}

type Block =
  | { kind: "heading"; level: number; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "code"; text: string; lang: string }
  | { kind: "list"; ordered: boolean; items: string[] }
  | { kind: "quote"; text: string };

const BOLD_LINE = /^\s*(\*\*|__)[^*_]+\1:?\s*$/;

function parseBlocks(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === "") {
      i += 1;
      continue;
    }

    const fence = /^```(\w*)/.exec(line);
    if (fence) {
      const lang = fence[1] ?? "";
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !/^```/.test(lines[i])) {
        codeLines.push(lines[i]);
        i += 1;
      }
      i += 1; // skip closing fence
      blocks.push({ kind: "code", text: codeLines.join("\n"), lang });
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      blocks.push({ kind: "heading", level: heading[1].length, text: heading[2] });
      i += 1;
      continue;
    }

    const quote = /^>\s?(.*)$/.exec(line);
    if (quote) {
      const quoteLines = [quote[1]];
      i += 1;
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quoteLines.push(lines[i].replace(/^>\s?/, ""));
        i += 1;
      }
      blocks.push({ kind: "quote", text: quoteLines.join(" ") });
      continue;
    }

    const bullet = /^\s*[-*]\s+(.*)$/.exec(line);
    const ordered = /^\s*\d+\.\s+(.*)$/.exec(line);
    if (bullet || ordered) {
      const isOrdered = Boolean(ordered);
      const items: string[] = [];
      while (i < lines.length) {
        const m = isOrdered
          ? /^\s*\d+\.\s+(.*)$/.exec(lines[i])
          : /^\s*[-*]\s+(.*)$/.exec(lines[i]);
        if (!m) break;
        items.push(m[1]);
        i += 1;
      }
      blocks.push({ kind: "list", ordered: isOrdered, items });
      continue;
    }

    // A line that is only bold text ("**Input**") is a section label: its
    // own line, never run into the sentence under it.
    if (BOLD_LINE.test(line)) {
      blocks.push({ kind: "paragraph", text: line.trim() });
      i += 1;
      continue;
    }

    // Paragraph: consume consecutive non-blank, non-special lines, soft-wrapped
    // with a space, matching how markdown treats single newlines within a
    // paragraph.
    const paraLines = [line];
    i += 1;
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !BOLD_LINE.test(lines[i]) &&
      !/^```/.test(lines[i]) &&
      !/^(#{1,6})\s+/.test(lines[i]) &&
      !/^>\s?/.test(lines[i]) &&
      !/^\s*[-*]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i])
    ) {
      paraLines.push(lines[i]);
      i += 1;
    }
    blocks.push({ kind: "paragraph", text: paraLines.join(" ") });
  }

  return blocks;
}

const HEADING_CLASSES: Record<number, string> = {
  1: "text-lg font-semibold text-[#0F0F0F]",
  2: "text-base font-semibold text-[#0F0F0F]",
  3: "text-sm font-semibold text-[#0F0F0F] uppercase tracking-wide",
};

export function Markdown({ text }: { text: string }) {
  const blocks = parseBlocks(text);
  return (
    <div className="flex flex-col gap-3">
      {blocks.map((block, index) => {
        const key = `b-${index}`;
        switch (block.kind) {
          case "heading":
            return (
              <p key={key} className={HEADING_CLASSES[Math.min(block.level, 3)]}>
                {renderInlineTokens(tokenizeInline(block.text), key)}
              </p>
            );
          case "paragraph":
            return (
              <p key={key} className="text-sm leading-relaxed text-[#404040]">
                {renderInlineTokens(tokenizeInline(block.text), key)}
              </p>
            );
          case "code":
            return (
              <pre
                key={key}
                className="rounded-lg bg-[#0F0F0F] text-[#F5F3EE] text-xs p-3 overflow-x-auto font-mono"
              >
                <code>{block.text}</code>
              </pre>
            );
          case "quote":
            return (
              <p
                key={key}
                className="border-l-2 border-[#D4D4D4] pl-3 text-sm italic text-[#737373]"
              >
                {renderInlineTokens(tokenizeInline(block.text), key)}
              </p>
            );
          case "list":
            return block.ordered ? (
              <ol key={key} className="list-decimal pl-5 flex flex-col gap-1">
                {block.items.map((item, itemIndex) => (
                  <li key={`${key}-${itemIndex}`} className="text-sm leading-relaxed text-[#404040]">
                    {renderInlineTokens(tokenizeInline(item), `${key}-${itemIndex}`)}
                  </li>
                ))}
              </ol>
            ) : (
              <ul key={key} className="list-disc pl-5 flex flex-col gap-1">
                {block.items.map((item, itemIndex) => (
                  <li key={`${key}-${itemIndex}`} className="text-sm leading-relaxed text-[#404040]">
                    {renderInlineTokens(tokenizeInline(item), `${key}-${itemIndex}`)}
                  </li>
                ))}
              </ul>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
