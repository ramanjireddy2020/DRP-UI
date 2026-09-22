import React, { useState } from "react";
import { Box, Typography, IconButton, Chip, CircularProgress } from "@mui/material";
import { ExpandMoreOutlined } from "@mui/icons-material";
import { FONT, TEAL, BORDER } from "./workflowConstants";
import { moduleDisplayFor } from "../../workflow/moduleMap";

/**
 * One module's output, as a card in the conversation.
 *
 * W2. The five phase screens used to be mutually exclusive full-height views —
 * seeing LitMineX meant TxKG was gone. Here each one is a card that stays
 * where it ran, so the whole session remains scrollable and inspectable.
 *
 * This is deliberately presentational. Choosing *which* phase component to
 * draw stays in CompleteWorkflow, because those components take twenty-odd
 * props each and routing them through here would add a layer without removing
 * any coupling.
 *
 * Collapsing matters for more than tidiness: the TxKG subgraph and the docking
 * views are expensive, and a long session would otherwise mount all five at
 * once. A collapsed card does not render its body at all.
 */
const ModuleResultCard = ({
  moduleKey,
  /** "running" | "done" | "failed" | "idle" — drives the status chip. */
  status = "idle",
  defaultExpanded = true,
  /** Highlights the card the session is currently on. */
  isActive = false,
  children,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const display = moduleDisplayFor(moduleKey) ?? { label: moduleKey, role: null };

  const statusChip = {
    running: { label: "Running", color: "#B4670E", bg: "rgba(180,103,14,0.12)" },
    done: { label: "Completed", color: "#0F766E", bg: "rgba(15,118,110,0.12)" },
    failed: { label: "Failed", color: "#B4232C", bg: "rgba(180,35,44,0.12)" },
    idle: null,
  }[status];

  return (
    <Box
      sx={{
        border: `1px solid ${isActive ? TEAL : BORDER}`,
        borderRadius: "12px",
        bgcolor: "#FFFFFF",
        overflow: "hidden",
      }}
    >
      {/* ---------------------------------------------------------- header */}
      <Box
        onClick={() => setExpanded((v) => !v)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setExpanded((v) => !v);
          }
        }}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          px: "16px",
          py: "12px",
          cursor: "pointer",
          bgcolor: isActive ? "rgba(0,188,212,0.05)" : "#FBFDFE",
          borderBottom: expanded ? `1px solid ${BORDER}` : "none",
          "&:hover": { bgcolor: "rgba(0,188,212,0.07)" },
        }}
      >
        <Box
          sx={{
            width: 28,
            height: 28,
            borderRadius: "8px",
            bgcolor: "#F0FDF9",
            border: `1px solid ${TEAL}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {status === "running" ? (
            <CircularProgress size={12} sx={{ color: TEAL }} />
          ) : (
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <path d="M7 0L8.5 5.5L14 7L8.5 8.5L7 14L5.5 8.5L0 7L5.5 5.5L7 0Z" fill="#00BCD4" />
            </svg>
          )}
        </Box>

        {/* Item T5: name as written, full agent name beneath it. */}
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            sx={{
              fontFamily: FONT,
              fontSize: "13px",
              fontWeight: 700,
              color: "#1E293B",
              lineHeight: 1.25,
            }}
          >
            {display.label}
          </Typography>

          {display.role && (
            <Typography
              sx={{ fontFamily: FONT, fontSize: "11px", color: "#94A3B8", lineHeight: 1.3 }}
            >
              ({display.role})
            </Typography>
          )}
        </Box>

        {statusChip && (
          <Chip
            label={statusChip.label}
            size="small"
            sx={{
              bgcolor: statusChip.bg,
              color: statusChip.color,
              fontFamily: FONT,
              fontSize: "10px",
              fontWeight: 700,
              height: "19px",
              borderRadius: "5px",
              "& .MuiChip-label": { px: "8px" },
            }}
          />
        )}

        <IconButton
          size="small"
          aria-label={expanded ? `Collapse ${display.label}` : `Expand ${display.label}`}
          sx={{
            transform: expanded ? "rotate(0deg)" : "rotate(-90deg)",
            transition: "transform 0.15s ease",
          }}
        >
          <ExpandMoreOutlined sx={{ fontSize: 18, color: "#64748B" }} />
        </IconButton>
      </Box>

      {/* ------------------------------------------------------------ body */}
      {expanded && <Box sx={{ minWidth: 0 }}>{children}</Box>}
    </Box>
  );
};

export default ModuleResultCard;
