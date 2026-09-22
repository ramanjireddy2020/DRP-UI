import React, { useEffect, useLayoutEffect, useRef } from "react";
import { Box, Typography, CircularProgress } from "@mui/material";
import { FONT, TEAL, BORDER, TEXT_DARK, USER_MSG_BG } from "./workflowConstants";
import { moduleDisplayFor } from "../../workflow/moduleMap";
import { useCurrentUser } from "../../context/CurrentUserContext";

/**
 * The conversation, as one continuous thread.
 *
 * W1. Before this, the workspace showed exactly one module at a time:
 * `renderContent()` in CompleteWorkflow picked a single phase component and
 * that component drew its own private chat bubbles. Three consequences, all
 * reported by the testing team:
 *
 *   - A follow-up asked while TxKG, ScreenSuite or NovSearch was on screen was
 *     stored in session state and never rendered, because only LitMineX and
 *     CurateX were passed the messages (defect B1).
 *   - Moving to the next module made the previous one's answers disappear.
 *   - There was no single place where the session read as a conversation.
 *
 * The thread itself was never the problem — the session store has always kept
 * it append-only and tagged per module. This component just renders all of it,
 * in order, with each module's result card sitting at the point in the thread
 * where that module ran.
 *
 * Scrolling: it follows new content only when the reader is already at the
 * bottom. The parent re-renders about once a second while a job polls, and
 * yanking the viewport down mid-read on every poll is worse than not following
 * at all.
 */

const NEAR_BOTTOM_PX = 120;

/* ------------------------------------------------------------------ bubbles */

const UserBubble = ({ text, label }) => (
  <Box sx={{ display: "flex", justifyContent: "flex-end", width: "100%" }}>
    <Box
      sx={{
        maxWidth: "620px",
        bgcolor: USER_MSG_BG,
        border: `1px solid ${BORDER}`,
        borderRadius: "12px",
        p: "14px 18px",
      }}
    >
      <Typography
        sx={{
          fontFamily: FONT,
          fontSize: "10px",
          fontWeight: 700,
          color: TEAL,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          mb: "6px",
        }}
      >
        {label}
      </Typography>

      <Typography
        sx={{
          fontFamily: FONT,
          fontSize: "14px",
          lineHeight: "21px",
          color: TEXT_DARK,
          whiteSpace: "pre-wrap",
        }}
      >
        {text}
      </Typography>
    </Box>
  </Box>
);

const AgentBubble = ({ text, moduleKey, agentName, isError }) => {
  const display = moduleKey ? moduleDisplayFor(moduleKey) : null;

  // `agentName` is what the API called itself on this reply ("DRP LitMineX
  // Agent"); the registry spelling wins when the module is known, so the five
  // modules cannot drift apart in the transcript.
  const name = display?.label || agentName || "Agent";
  const role = display?.role || null;

  return (
    <Box sx={{ display: "flex", justifyContent: "flex-start", width: "100%" }}>
      <Box
        sx={{
          maxWidth: "760px",
          bgcolor: "#FFFFFF",
          border: `1px solid ${isError ? "#FCA5A5" : BORDER}`,
          borderRadius: "12px",
          p: "14px 18px",
        }}
      >
        <Box sx={{ mb: "8px" }}>
          <Typography
            sx={{
              fontFamily: FONT,
              fontSize: "12px",
              fontWeight: 700,
              color: isError ? "#B4232C" : "#1E293B",
              lineHeight: 1.25,
            }}
          >
            {name}
          </Typography>

          {role && !isError && (
            <Typography
              sx={{ fontFamily: FONT, fontSize: "11px", color: "#94A3B8", lineHeight: 1.3 }}
            >
              ({role})
            </Typography>
          )}
        </Box>

        <Typography
          sx={{
            fontFamily: FONT,
            fontSize: "14px",
            lineHeight: "21px",
            color: isError ? "#B4232C" : TEXT_DARK,
            whiteSpace: "pre-wrap",
          }}
        >
          {text}
        </Typography>
      </Box>
    </Box>
  );
};

/* ----------------------------------------------------------------- timeline */

/**
 * @param {object[]} blocks - ordered, from buildTimelineBlocks in the parent.
 *   { kind: "message", id, message } | { kind: "module", id, moduleKey }
 * @param {(moduleKey: string) => React.ReactNode} renderModule - draws one
 *   module's result card. The parent keeps this, because the five phase
 *   components take upwards of twenty props each and threading them through
 *   here would buy nothing.
 * @param {boolean} pending - a message is in flight.
 * @param {object} scrollAnchors - ref object the parent can read to scroll a
 *   module's card into view from the rail.
 */
const ConversationTimeline = ({
  blocks,
  renderModule,
  pending = false,
  scrollAnchors,
}) => {
  const { chatLabel: userLabel } = useCurrentUser();

  const scrollerRef = useRef(null);
  const stickToBottom = useRef(true);

  // Record whether the reader was at the bottom BEFORE this render's DOM
  // changes are painted, so the decision is not made against the new height.
  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottom.current = distance <= NEAR_BOTTOM_PX;
  });

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || !stickToBottom.current) return;
    el.scrollTop = el.scrollHeight;
  }, [blocks, pending]);

  const onScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottom.current = distance <= NEAR_BOTTOM_PX;
  };

  return (
    <Box
      ref={scrollerRef}
      onScroll={onScroll}
      sx={{
        flex: 1,
        overflowY: "auto",
        overflowX: "hidden",
        px: { xs: "16px", md: "32px" },
        py: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "18px",
      }}
    >
      {blocks.map((block) => {
        if (block.kind === "message") {
          const m = block.message;
          return (
            <Box key={block.id}>
              {m.role === "user" ? (
                <UserBubble text={m.text} label={userLabel} />
              ) : (
                <AgentBubble
                  text={m.text}
                  moduleKey={m.moduleKey}
                  agentName={m.agentName}
                  isError={m.isError}
                />
              )}
            </Box>
          );
        }

        return (
          <Box
            key={block.id}
            ref={(node) => {
              if (scrollAnchors) scrollAnchors.current[block.moduleKey] = node;
            }}
          >
            {renderModule(block.moduleKey)}
          </Box>
        );
      })}

      {pending && (
        <Box sx={{ display: "flex", alignItems: "center", gap: "10px", pl: "4px" }}>
          <CircularProgress size={13} sx={{ color: TEAL }} />
          <Typography sx={{ fontFamily: FONT, fontSize: "12px", color: "#94A3B8" }}>
            Thinking…
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default ConversationTimeline;
