import React, { useState } from "react";
import { Box, Button, Menu, MenuItem, Typography, CircularProgress } from "@mui/material";
import { FONT, TEAL, BORDER, TEXT_DARK } from "./workflowConstants";

/**
 * The Branch / Rerun / Export row, and the primary "continue" button.
 *
 * Every phase screen used to render its own copy as
 * `["Branch", "Rerun", "Export"].map(label => <Button>{label}</Button>)` — ten
 * such sites across the five screens, none with an onClick. All three controls
 * looked live and did nothing.
 *
 * Centralising them means one wiring:
 *   Branch → POST /sessions/{id}/steps with fromStepId = this step
 *   Rerun  → POST /sessions/{id}/steps/{stepId}/rerun
 *   Export → POST /exports, then fetch the download with the bearer token
 *
 * A handler left undefined disables its button and says why on hover, rather
 * than rendering an enabled control that silently does nothing.
 */
const PhaseActions = ({
  onBranch,
  onRerun,
  onExport,
  /** The primary step-forward action, e.g. "Continue to CurateX". */
  continueLabel,
  onContinue,
  continuePending = false,
  continueDisabled = false,
  continueDisabledReason,
  /** Set while a rerun/branch/export request is in flight. */
  busy = null,
  /** Surfaced under the row when one of the actions fails. */
  error = null,
}) => {
  const [exportAnchor, setExportAnchor] = useState(null);

  const secondaryStyle = {
    textTransform: "none",
    fontFamily: FONT,
    fontSize: "13px",
    fontWeight: 500,
    color: TEXT_DARK,
    bgcolor: "#FFFFFF",
    border: `1px solid ${BORDER}`,
    borderRadius: "8px",
    px: "16px",
    py: "7px",
    "&:hover": { bgcolor: "#F8FAFC", borderColor: "#CBD5E1" },
    "&.Mui-disabled": { color: "#94A3B8", bgcolor: "#F8FAFC" },
  };

  const chooseFormat = (format) => {
    setExportAnchor(null);
    onExport?.(format);
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "8px", pt: "4px" }}>
      <Box sx={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
        <Button
          onClick={onBranch}
          disabled={!onBranch || Boolean(busy)}
          title={onBranch ? "Fork the research from this step" : "Branching needs a saved step"}
          sx={secondaryStyle}
        >
          {busy === "branch" ? "Branching…" : "Branch"}
        </Button>

        <Button
          onClick={onRerun}
          disabled={!onRerun || Boolean(busy)}
          title={onRerun ? "Run this step again" : "Rerun needs a saved step"}
          sx={secondaryStyle}
        >
          {busy === "rerun" ? "Rerunning…" : "Rerun"}
        </Button>

        <Button
          onClick={(e) => setExportAnchor(e.currentTarget)}
          disabled={!onExport || Boolean(busy)}
          title={onExport ? "Download these results" : "Export needs a completed job"}
          sx={secondaryStyle}
        >
          {busy === "export" ? "Exporting…" : "Export"}
        </Button>

        <Menu
          anchorEl={exportAnchor}
          open={Boolean(exportAnchor)}
          onClose={() => setExportAnchor(null)}
        >
          {/* The API takes a `format`, so the choice is offered rather than
              assumed. PDF goes to /exports/pdf, the rest to /exports. */}
          {["csv", "xlsx", "json", "pdf"].map((format) => (
            <MenuItem
              key={format}
              onClick={() => chooseFormat(format)}
              sx={{ fontFamily: FONT, fontSize: "13px" }}
            >
              {format === "pdf" ? "PDF report" : format.toUpperCase()}
            </MenuItem>
          ))}
        </Menu>

        {continueLabel && (
          <Button
            onClick={onContinue}
            disabled={!onContinue || continueDisabled || continuePending || Boolean(busy)}
            title={continueDisabled ? continueDisabledReason : undefined}
            sx={{
              ml: "auto",
              textTransform: "none",
              fontFamily: FONT,
              fontSize: "13px",
              fontWeight: 600,
              color: "#FFFFFF",
              bgcolor: TEAL,
              borderRadius: "8px",
              px: "18px",
              py: "7px",
              display: "flex",
              gap: "8px",
              "&:hover": { bgcolor: "#089B98" },
              "&.Mui-disabled": { bgcolor: "#E2E8F0", color: "#94A3B8" },
            }}
          >
            {continuePending && <CircularProgress size={13} sx={{ color: "#FFFFFF" }} />}
            {continuePending ? "Starting…" : continueLabel}
          </Button>
        )}
      </Box>

      {continueDisabled && continueDisabledReason && (
        <Typography sx={{ fontFamily: FONT, fontSize: "11px", color: "#94A3B8" }}>
          {continueDisabledReason}
        </Typography>
      )}

      {error && (
        <Typography role="alert" sx={{ fontFamily: FONT, fontSize: "12px", color: "#DC2626" }}>
          {error}
        </Typography>
      )}
    </Box>
  );
};

export default PhaseActions;
