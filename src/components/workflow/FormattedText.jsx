import React from "react";
import { Box, Typography } from "@mui/material";
import { FONT, TEAL } from "./workflowConstants";

/**
 * Agent text with its markdown rendered.
 *
 * Testing found supervisor and agent replies shown as raw text: "**bold**"
 * with the asterisks, "1." lists run together, "###" headings as literal
 * hashes. There was no markdown rendering anywhere in the app. This handles
 * the subset the agents actually produce — paragraphs, headings, bullet and
 * numbered lists, **bold**, *italic* / _italic_, `code` and [links](url) —
 * without adding a dependency. Anything else is shown as plain text.
 */

const INLINE = /(\*\*[^*]+\*\*|__[^_]+__|\*[^*\s][^*]*\*|_[^_\s][^_]*_|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/g;

const renderInline = (text, keyBase) =>
  String(text)
    .split(INLINE)
    .filter((part) => part !== "")
    .map((part, i) => {
      const key = `${keyBase}-${i}`;
      if (/^(\*\*|__).+\1$/.test(part)) return <strong key={key}>{part.slice(2, -2)}</strong>;
      if (/^`.+`$/.test(part)) {
        return (
          <Box key={key} component="code" sx={{ fontFamily: "monospace", fontSize: "0.92em", bgcolor: "#F1F5F9", px: "3px", borderRadius: "3px" }}>
            {part.slice(1, -1)}
          </Box>
        );
      }
      const link = part.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
      if (link) {
        return (
          <Box key={key} component="a" href={link[2]} target="_blank" rel="noopener noreferrer" sx={{ color: TEAL, textDecoration: "none", "&:hover": { textDecoration: "underline" } }}>
            {link[1]}
          </Box>
        );
      }
      if (/^(\*|_).+\1$/.test(part)) return <em key={key}>{part.slice(1, -1)}</em>;
      return <React.Fragment key={key}>{part}</React.Fragment>;
    });

/** Split into blocks: headings, lists (bullet / numbered) and paragraphs. */
const parseBlocks = (source) => {
  const blocks = [];
  let paragraph = [];
  let list = null;

  const flushParagraph = () => {
    if (paragraph.length) blocks.push({ kind: "p", text: paragraph.join(" ") });
    paragraph = [];
  };
  const flushList = () => {
    if (list) blocks.push(list);
    list = null;
  };

  String(source ?? "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .forEach((raw) => {
      const line = raw.trim();
      if (!line) {
        flushParagraph();
        flushList();
        return;
      }
      const heading = line.match(/^(#{1,6})\s+(.*)$/);
      const bullet = line.match(/^[-*•]\s+(.*)$/);
      const numbered = line.match(/^(\d+)[.)]\s+(.*)$/);

      if (heading) {
        flushParagraph();
        flushList();
        blocks.push({ kind: "h", level: heading[1].length, text: heading[2] });
      } else if (bullet || numbered) {
        flushParagraph();
        const kind = numbered ? "ol" : "ul";
        if (!list || list.kind !== kind) {
          flushList();
          list = { kind, items: [], start: numbered ? Number(numbered[1]) : 1 };
        }
        list.items.push(numbered ? numbered[2] : bullet[1]);
      } else if (list && /^\s{2,}/.test(raw)) {
        // An indented continuation line belongs to the previous list item.
        list.items[list.items.length - 1] += ` ${line}`;
      } else {
        flushList();
        paragraph.push(line);
      }
    });

  flushParagraph();
  flushList();
  return blocks;
};

const FormattedText = ({ text, fontSize = "14px", color = "#334155", lineHeight = 1.6, sx }) => {
  const blocks = parseBlocks(text);
  const base = { fontFamily: FONT, fontSize, color, lineHeight };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "8px", ...sx }}>
      {blocks.map((block, i) => {
        if (block.kind === "h") {
          return (
            <Typography key={i} sx={{ ...base, fontWeight: 700, color: "#0F172A", fontSize: block.level <= 2 ? "1.1em" : "1em" }}>
              {renderInline(block.text, `h${i}`)}
            </Typography>
          );
        }
        if (block.kind === "ul" || block.kind === "ol") {
          return (
            <Box
              key={i}
              component={block.kind}
              start={block.kind === "ol" ? block.start : undefined}
              sx={{ ...base, m: 0, pl: "20px", display: "flex", flexDirection: "column", gap: "4px" }}
            >
              {block.items.map((item, j) => (
                <li key={j}>{renderInline(item, `li${i}-${j}`)}</li>
              ))}
            </Box>
          );
        }
        return (
          <Typography key={i} sx={base}>
            {renderInline(block.text, `p${i}`)}
          </Typography>
        );
      })}
    </Box>
  );
};

/** The same text with markdown markers removed, for places that need plain text. */
export const stripMarkdown = (text) =>
  String(text ?? "")
    .replace(/\*\*([^*]+)\*\*|__([^_]+)__/g, "$1$2")
    .replace(/\*([^*\s][^*]*)\*|_([^_\s][^_]*)_/g, "$1$2")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^#{1,6}\s+/gm, "");

export default FormattedText;
