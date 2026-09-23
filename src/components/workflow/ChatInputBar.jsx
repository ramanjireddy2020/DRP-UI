import React, { useEffect, useRef, useState } from "react";
import { Box, TextField, IconButton, CircularProgress, Typography } from "@mui/material";
import { FONT, TEAL, GRAY_BG, BORDER, TEXT_DARK, TEXT_MUTED } from "./workflowConstants";
import modulesApi from "../../services/api/modules";

/**
 * The chat bar — the one input that drives the whole workflow.
 *
 * Two reasons this is a module-level component rather than a closure inside
 * CompleteWorkflow:
 *
 *  1. Defined inline, its function identity changed on every parent render, so
 *     React unmounted and remounted the TextField after each keystroke and the
 *     caret was lost. The input was effectively unusable for anything longer
 *     than one character.
 *
 *  2. The draft now lives here. The parent re-renders on every polled job
 *     status — once a second while an agent runs — and lifting the draft out
 *     means those renders cannot disturb what is being typed.
 *
 * `onSend` is expected to POST the message and resolve; the field clears only
 * once it has been handed over.
 */
/**
 * The @mention the caret currently sits inside, if any.
 *
 * Matches an "@word" that runs to the end of what has been typed, so the
 * dropdown appears while a module name is being written and closes once a
 * space is typed after it.
 */
const activeMention = (text) => {
  const match = /(^|\s)@([A-Za-z0-9_-]*)$/.exec(text ?? "");
  return match ? { query: match[2], start: match.index + match[1].length } : null;
};

const ChatInputBar = ({ onSend, pending = false, placeholder, hint }) => {
  const [value, setValue] = useState("");

  /**
   * @module autocomplete, backed by GET /modules/search?q=.
   *
   * Not decoration: the chat bar no longer guesses routing from keywords, so an
   * explicit @Module is the only way a message starts a new agent run. The
   * dropdown is what makes that discoverable, and it inserts the API's own
   * `key` spelling so the supervisor matches on it rather than falling through
   * to keyword inference.
   */
  const [mentionResults, setMentionResults] = useState([]);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionIndex, setMentionIndex] = useState(0);
  const inputRef = useRef(null);

  const mention = activeMention(value);

  useEffect(() => {
    if (!mention) {
      setMentionOpen(false);
      return undefined;
    }

    let cancelled = false;
    // Debounced: this fires on every keystroke after an @.
    const timer = setTimeout(() => {
      modulesApi
        .searchModules(mention.query)
        .then((list) => {
          if (cancelled) return;
          const rows = Array.isArray(list) ? list : [];
          setMentionResults(rows);
          setMentionIndex(0);
          setMentionOpen(rows.length > 0);
        })
        .catch(() => {
          // A failed lookup just means no suggestions — the researcher can
          // still type the module name by hand.
          if (!cancelled) setMentionOpen(false);
        });
    }, 180);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mention?.query]);

  const applyMention = (module) => {
    const current = activeMention(value);
    if (!current) return;
    // Replace the partial "@lit" with "@LitMineX " using the API's own key.
    setValue(`${value.slice(0, current.start)}@${module.key} `);
    setMentionOpen(false);
    inputRef.current?.focus();
  };

  const disabled = pending;
  const canSend = value.trim().length > 0 && !disabled;

  const submit = () => {
    if (!canSend) return;
    const text = value.trim();
    // Cleared straight away: the parent echoes the message into the thread, so
    // leaving it in the box would show it twice.
    setValue("");
    setMentionOpen(false);
    onSend(text);
  };

  return (
    <Box
      sx={{
        p: "12px 16px",
        bgcolor: GRAY_BG,
        borderTop: `1px solid ${BORDER}`,
        flexShrink: 0,
      }}
    >
      <Box
        sx={{
          bgcolor: "#FFFFFF",
          border: "1.5px solid #E2E8F0",
          borderRadius: "16px",
          p: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          position: "relative",
        }}
      >
        {/* @module suggestions */}
        {mentionOpen && (
          <Box
            role="listbox"
            aria-label="Modules"
            sx={{
              position: "absolute",
              bottom: "calc(100% + 6px)",
              left: 0,
              right: 0,
              bgcolor: "#FFFFFF",
              border: `1px solid ${BORDER}`,
              borderRadius: "12px",
              boxShadow: "0 8px 24px rgba(15,23,42,0.12)",
              overflow: "hidden",
              zIndex: 20,
              maxHeight: "240px",
              overflowY: "auto",
            }}
          >
            {mentionResults.map((module, i) => (
              <Box
                key={module.key}
                role="option"
                aria-selected={i === mentionIndex}
                onMouseDown={(e) => {
                  // mousedown, not click: the input must not blur first.
                  e.preventDefault();
                  applyMention(module);
                }}
                onMouseEnter={() => setMentionIndex(i)}
                sx={{
                  p: "10px 14px",
                  cursor: "pointer",
                  bgcolor: i === mentionIndex ? "rgba(0,188,212,0.08)" : "transparent",
                  borderBottom: i < mentionResults.length - 1 ? `1px solid ${BORDER}` : "none",
                }}
              >
                <Typography
                  sx={{ fontFamily: FONT, fontSize: "13px", fontWeight: 600, color: TEXT_DARK }}
                >
                  {module.displayName || module.key}
                </Typography>
                {module.description && (
                  <Typography
                    sx={{
                      fontFamily: FONT,
                      fontSize: "11px",
                      color: TEXT_MUTED,
                      mt: "2px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {module.description}
                  </Typography>
                )}
              </Box>
            ))}
          </Box>
        )}

        <TextField
          inputRef={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            // While the dropdown is open the arrow keys and Enter belong to it.
            if (mentionOpen && mentionResults.length) {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setMentionIndex((n) => (n + 1) % mentionResults.length);
                return;
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setMentionIndex((n) => (n - 1 + mentionResults.length) % mentionResults.length);
                return;
              }
              if (e.key === "Enter" || e.key === "Tab") {
                e.preventDefault();
                applyMention(mentionResults[mentionIndex]);
                return;
              }
              if (e.key === "Escape") {
                e.preventDefault();
                setMentionOpen(false);
                return;
              }
            }

            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          disabled={disabled}
          placeholder={placeholder || "Type @ for modules or ask a research question..."}
          fullWidth
          multiline
          maxRows={3}
          variant="standard"
          inputProps={{ "aria-label": "Ask a research question" }}
          sx={{
            "& .MuiInput-root": { fontFamily: FONT, fontSize: "13px", color: TEXT_DARK },
            "& .MuiInput-root:before": { display: "none" },
            "& .MuiInput-root:after": { display: "none" },
          }}
        />

        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: "6px" }}>
            {/* The "+" attach and microphone buttons had no handlers. They are
                gone rather than wired: POST /sessions/{id}/messages takes only
                { message, stepId }, so an uploaded file would have nowhere to
                go, and there is no speech endpoint. */}
            {/* Says why the module changed, since only an @mention can do it. */}
            {hint && (
              <Typography sx={{ fontFamily: FONT, fontSize: "11px", color: TEXT_MUTED }}>
                {hint}
              </Typography>
            )}
          </Box>

          <Box sx={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <IconButton
              size="small"
              onClick={submit}
              disabled={!canSend}
              aria-label={pending ? "Sending" : "Send message"}
              sx={{
                bgcolor: canSend ? TEAL : "#CBD5E1",
                color: "#FFFFFF",
                width: 32,
                height: 32,
                "&:hover": { bgcolor: canSend ? "#089B98" : "#CBD5E1" },
                "&.Mui-disabled": { bgcolor: "#CBD5E1", color: "#FFFFFF" },
              }}
            >
              {pending ? (
                <CircularProgress size={14} sx={{ color: "#FFFFFF" }} />
              ) : (
                <Box component="span" sx={{ fontSize: "14px", lineHeight: 1 }}>
                  ↑
                </Box>
              )}
            </IconButton>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default ChatInputBar;
