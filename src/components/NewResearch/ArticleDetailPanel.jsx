import React, { useEffect, useRef, useState } from "react";
import { Box, Button, IconButton, TextField, Typography } from "@mui/material";
import { CloseOutlined } from "@mui/icons-material";
import FormattedText from "../workflow/FormattedText";
import { FONT, TEAL, BORDER, TEXT_MUTED } from "../workflow/workflowConstants";
import { pubmedUrl } from "../../workflow/sourceLinks";

/**
 * Article Detail side panel (LitMineX).
 *
 * Items 21 and 22. The abstract was a fixed paragraph about Metformin and
 * JAK2, the authors defaulted to "Chen, S. et al.", "View on PubMed Central"
 * was a Typography with no href, and both buttons had no onClick. All four
 * now come from GET /articles/{id} and its sibling endpoints.
 *
 * Its own module on purpose, like ChatInputBar: declared inside
 * CompleteWorkflow it was a new component on every render, so the panel
 * remounted about once a second while jobs polled. Testing saw the article
 * chat scroll back up after Enter and the answer drop out of view.
 */
const ArticleDetailPanel = ({
  open,
  /** The list row that was clicked. */
  selectedArticle,
  /** GET /articles/{id}, merged over the row. */
  articleDetail,
  /** GET /articles/{id}/pmc-link → { url, provider }. */
  articlePmc,
  /** "detail" | "save" | "chat" | null */
  articleBusy,
  articleChat = [],
  /** { text, isError } */
  articleNotice,
  onClose,
  onSave,
  onAsk,
}) => {
  const [question, setQuestion] = useState("");
  const chatEndRef = useRef(null);

  // Keep the newest question/answer in view. The panel used to be declared
  // inside CompleteWorkflow, so it remounted on every parent render (about
  // once a second while jobs poll): its scroll jumped back to the top after
  // Enter and the answer below was out of sight.
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [articleChat.length, articleBusy]);

  if (!open || !selectedArticle) return null;

  // The list row is shown immediately; the full record is MERGED over it.
  // Replacing the row with the detail meant an empty `keywords: []` from
  // GET /articles/{id} hid the keywords the row already had.
  const article = { ...selectedArticle };
  if (articleDetail && typeof articleDetail === "object") {
    Object.entries(articleDetail).forEach(([key, value]) => {
      if (value == null) return;
      if (typeof value === "string" && !value.trim()) return;
      if (Array.isArray(value) && !value.length) return;
      article[key] = value;
    });
  }

  const keywords = Array.isArray(article.keywords)
    ? article.keywords
    : typeof article.keywords === "string"
    ? article.keywords.split(",").map((k) => k.trim()).filter(Boolean)
    : article.keywordList || [];

  // The article's pmcLink; failing that, GET /articles/{id}/pmc-link; and
  // only then the PubMed record derived from the article id.
  const externalUrl = article.pmcLink || articlePmc?.url || pubmedUrl(article.id);
  const externalLabel = article.pmcLink
    ? "View on PubMed Central"
    : articlePmc?.url
    ? `View on ${articlePmc.provider || "PubMed Central"}`
    : "View on PubMed";

  return (
    <Box sx={{
      position: "fixed",
      right: 0,
      top: 0,
      width: "380px",
      height: "100vh",
      bgcolor: "#FFFFFF",
      borderLeft: `1px solid ${BORDER}`,
      boxShadow: "-4px 0 24px rgba(0,0,0,0.08)",
      zIndex: 1300,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    }}>
      <Box sx={{ flex: 1, overflowY: "auto", p: "28px 28px 32px", display: "flex", flexDirection: "column", gap: "20px" }}>
        <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
          <IconButton size="small" onClick={onClose} sx={{ color: "#6B7280" }}>
            <CloseOutlined sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>

        <Typography sx={{ fontFamily: FONT, fontSize: "22px", fontWeight: 700, color: "#111827", lineHeight: "28px", mt: "-8px" }}>
          Article Detail
        </Typography>

        <Box>
          <Typography sx={{ fontFamily: FONT, fontSize: "11px", fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.06em", mb: "8px" }}>
            ARTICLE TITLE
          </Typography>
          <Typography sx={{ fontFamily: FONT, fontSize: "15px", fontWeight: 700, color: "#111827", lineHeight: "22px" }}>
            {article.title}
          </Typography>
        </Box>

        <Box sx={{ display: "flex", gap: "40px" }}>
          <Box>
            <Typography sx={{ fontFamily: FONT, fontSize: "11px", fontWeight: 500, color: "#6B7280", mb: "4px" }}>Authors</Typography>
            {/* Was hardcoded "Chen, S. et al." whenever the row had none. */}
            <Typography sx={{ fontFamily: FONT, fontSize: "14px", color: "#111827" }}>
              {article.authors || article.author || (articleBusy === "detail" ? "Loading…" : "Not listed")}
            </Typography>
          </Box>
          <Box>
            <Typography sx={{ fontFamily: FONT, fontSize: "11px", fontWeight: 500, color: "#6B7280", mb: "4px" }}>Year</Typography>
            <Typography sx={{ fontFamily: FONT, fontSize: "14px", color: "#111827" }}>{article.year || "—"}</Typography>
          </Box>
        </Box>

        <Box>
          <Typography sx={{ fontFamily: FONT, fontSize: "11px", fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.06em", mb: "8px" }}>
            ABSTRACT
          </Typography>
          <Typography sx={{ fontFamily: FONT, fontSize: "13px", color: "#374151", lineHeight: 1.6 }}>
            {article.abstract
              || (articleBusy === "detail" ? "Loading the abstract…" : "No abstract was returned for this article.")}
          </Typography>
        </Box>

        {keywords.length > 0 && (
          <Box>
            <Typography sx={{ fontFamily: FONT, fontSize: "11px", fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.06em", mb: "8px" }}>
              KEYWORDS
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {keywords.map((kw, i) => (
                <Box key={i} sx={{ px: "10px", py: "5px", bgcolor: "#F3F4F6", borderRadius: "4px" }}>
                  <Typography sx={{ fontFamily: FONT, fontSize: "12px", fontWeight: 500, color: "#374151" }}>{kw}</Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}

        <Box>
          <Typography sx={{ fontFamily: FONT, fontSize: "11px", fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.06em", mb: "8px" }}>
            FULL TEXT
          </Typography>
          {/* Item 21: a real anchor. This was a Typography with a pointer
              cursor and no href, so it looked like a link and did nothing. */}
          {externalUrl ? (
            <Typography
              component="a"
              href={externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ fontFamily: FONT, fontSize: "14px", fontWeight: 500, color: TEAL, textDecoration: "none", "&:hover": { textDecoration: "underline" } }}
            >
              ↗ {externalLabel}
            </Typography>
          ) : (
            <Typography sx={{ fontFamily: FONT, fontSize: "13px", color: TEXT_MUTED }}>
              No full-text link was returned for this article.
            </Typography>
          )}
        </Box>

        {/* Item 22: article chat. */}
        <Box>
          <Typography sx={{ fontFamily: FONT, fontSize: "11px", fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.06em", mb: "8px" }}>
            ASK ABOUT THIS PAPER
          </Typography>

          {articleChat.length > 0 && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: "8px", mb: "10px" }}>
              {articleChat.map((msg, i) => (
                <Box
                  key={i}
                  sx={{
                    p: "10px 12px",
                    borderRadius: "8px",
                    bgcolor: msg.role === "user" ? "#F0FDFC" : "#F8FAFC",
                    border: `1px solid ${BORDER}`,
                  }}
                >
                  {/* The full answer, formatted; it was plain text with the
                      markdown markers left in. */}
                  {msg.role === "user" || msg.isError ? (
                    <Typography sx={{ fontFamily: FONT, fontSize: "12px", color: msg.isError ? "#DC2626" : "#374151", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                      {msg.content}
                    </Typography>
                  ) : (
                    <FormattedText text={msg.content} fontSize="12px" color="#374151" />
                  )}
                  {/* The reply's citations were stored but never shown. */}
                  {Array.isArray(msg.citations) && msg.citations.length > 0 && (
                    <Box sx={{ mt: "6px", display: "flex", flexDirection: "column", gap: "2px" }}>
                      <Typography sx={{ fontFamily: FONT, fontSize: "10px", fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        Citations
                      </Typography>
                      {msg.citations.map((citation, ci) => {
                        const text =
                          typeof citation === "string"
                            ? citation
                            : citation?.title || citation?.text || citation?.source || citation?.id || citation?.pmid || "";
                        const href = typeof citation === "object" ? citation?.url || citation?.link || null : null;
                        if (!text && !href) return null;
                        return href ? (
                          <Typography key={ci} component="a" href={href} target="_blank" rel="noopener noreferrer" sx={{ fontFamily: FONT, fontSize: "11px", color: TEAL, textDecoration: "none", "&:hover": { textDecoration: "underline" } }}>
                            [{ci + 1}] {text || href} ↗
                          </Typography>
                        ) : (
                          <Typography key={ci} sx={{ fontFamily: FONT, fontSize: "11px", color: "#6B7280" }}>
                            [{ci + 1}] {String(text)}
                          </Typography>
                        );
                      })}
                    </Box>
                  )}
                </Box>
              ))}
            </Box>
          )}

          <div ref={chatEndRef} />

          {/* Controlled, and never disabled: disabling it while a reply was
              pending dropped focus and jumped the panel's scroll. Only a
              second send is blocked. */}
          <TextField
            placeholder="e.g. How does it modulate JAK2 signaling?"
            fullWidth
            size="small"
            multiline
            maxRows={3}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (articleBusy === "chat" || !question.trim()) return;
                onAsk(question);
                setQuestion("");
              }
            }}
            sx={{ "& .MuiOutlinedInput-root": { fontFamily: FONT, fontSize: "13px", borderRadius: "8px" } }}
          />
          <Typography sx={{ fontFamily: FONT, fontSize: "11px", color: TEXT_MUTED, mt: "4px" }}>
            {articleBusy === "chat" ? "Asking…" : "Press Enter to ask"}
          </Typography>
        </Box>

        {articleNotice && (
          <Typography
            role={articleNotice.isError ? "alert" : "status"}
            sx={{ fontFamily: FONT, fontSize: "12px", color: articleNotice.isError ? "#DC2626" : "#059669" }}
          >
            {articleNotice.text}
          </Typography>
        )}

        {/* Item 22: both buttons had no onClick at all. */}
        <Button
          fullWidth
          onClick={onSave}
          disabled={articleBusy === "save"}
          sx={{ bgcolor: TEAL, color: "#FFFFFF", textTransform: "none", fontFamily: FONT, fontSize: "14px", fontWeight: 600, p: "12px 24px", borderRadius: "8px", "&:hover": { bgcolor: "#089B98" }, "&.Mui-disabled": { bgcolor: "#E2E8F0", color: "#94A3B8" } }}
        >
          {articleBusy === "save" ? "Saving…" : "Save Article"}
        </Button>
      </Box>
    </Box>
  );
};

export default ArticleDetailPanel;
