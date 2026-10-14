import React, { useState } from "react";
import { Box, CircularProgress, Typography } from "@mui/material";
import { ExpandMoreOutlined } from "@mui/icons-material";
import { FONT, BORDER, TEXT_DARK, TEXT_MUTED } from "./workflowConstants";
import { moduleDisplayFor } from "../../workflow/moduleMap";
import useRunSummary from "../../hooks/useRunSummary";

/**
 * An earlier run of a module that has since been run again.
 *
 * Running a module a second time used to replace its card, so the first
 * results disappeared from the thread. The new run now gets its own card below;
 * this keeps what the earlier run found in its place above, collapsed by
 * default.
 *
 * What it found comes from the snapshot captured when it was superseded or,
 * when there is none (always the case after reopening a session), from the
 * server by the run's job id, loaded when the card is opened. It used to read
 * "This run produced no results to keep" for every earlier run after a
 * reopen (testing 2026-10-14).
 */
const ArchivedRunCard = ({ moduleKey, snapshot, run = null, label = "Earlier run" }) => {
  const [open, setOpen] = useState(false);
  const display = moduleDisplayFor(moduleKey);
  const hasSnapshot = Boolean(snapshot?.summary || snapshot?.items?.length);
  const remote = useRunSummary(moduleKey, run, open && !hasSnapshot && Boolean(run?.jobId));
  const shown = hasSnapshot ? snapshot : remote.section;
  const summaryLine = shown?.summary || (run?.jobId && !hasSnapshot ? "Earlier run · open to see its results" : "Superseded by the run below.");

  return (
    <Box sx={{ border: `1px solid ${BORDER}`, borderRadius: "12px", bgcolor: "#FFFFFF", overflow: "hidden" }}>
      <Box
        component="button"
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          width: "100%",
          p: "12px 16px",
          border: "none",
          background: "none",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontFamily: FONT, fontSize: "12px", fontWeight: 700, color: "#1E293B", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            {display?.label || moduleKey} · {label}
          </Typography>
          <Typography sx={{ fontFamily: FONT, fontSize: "12px", color: TEXT_MUTED }}>
            {summaryLine}
          </Typography>
        </Box>
        <ExpandMoreOutlined sx={{ color: "#94A3B8", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
      </Box>
      {open && (
        <Box sx={{ px: "16px", pb: "14px" }}>
          {remote.loading ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <CircularProgress size={14} sx={{ color: "#00BCD4" }} />
              <Typography sx={{ fontFamily: FONT, fontSize: "13px", color: TEXT_MUTED }}>Loading this run&apos;s results…</Typography>
            </Box>
          ) : remote.error && !hasSnapshot ? (
            <Typography role="alert" sx={{ fontFamily: FONT, fontSize: "13px", color: "#B91C1C" }}>{remote.error}</Typography>
          ) : shown?.items?.length ? (
            <Box component="ol" sx={{ m: 0, pl: "20px", display: "flex", flexDirection: "column", gap: "4px" }}>
              {shown.items.map((item, i) => (
                <li key={i}>
                  <Typography component="span" sx={{ fontFamily: FONT, fontSize: "13px", color: TEXT_DARK }}>
                    {item}
                  </Typography>
                </li>
              ))}
            </Box>
          ) : (
            <Typography sx={{ fontFamily: FONT, fontSize: "13px", color: TEXT_MUTED }}>
              {run?.jobId || hasSnapshot ? "This run returned no results." : "No results were recorded for this run."}
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
};

export default ArchivedRunCard;
