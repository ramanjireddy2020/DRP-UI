import React from "react";
import { Box, Typography, Button } from "@mui/material";
import { FONT, GRAY_BG, TEXT_DARK, TEXT_MUTED, TEAL } from "./workflowConstants";

/**
 * What a phase shows when its agent run fails.
 *
 * Before the API integration the workflow had only "-loading" and "-results"
 * phases, so a failed run left a spinner turning for ever. Every module now has
 * an "-error" phase and this is what renders in it.
 *
 * The message is the backend's own — the `error` field from
 * /agents/jobs/{jobId}/status, or the userMessage the axios interceptor shaped.
 * Nothing is invented and no fixture is substituted: a screen of plausible
 * fake results is worse than an honest failure.
 *
 * @param {string} title     - e.g. "LitMineX could not finish"
 * @param {string} message   - the backend's reason
 * @param {string} detail    - optional extra context this UI can add
 * @param {Function} onRetry - re-poll or re-run; hidden when not supplied
 * @param {Function} onBack  - return to the previous step
 * @param {boolean} expected - a known limitation rather than a fault, which
 *                             gets a neutral presentation instead of a red one
 */
const PhaseError = ({
  title = "This step could not finish",
  message,
  detail,
  onRetry,
  onBack,
  backLabel = "Back to previous step",
  expected = false,
}) => {
  const accent = expected ? "#94A3B8" : "#DC2626";
  const tint = expected ? "#F8FAFC" : "#FEF2F2";
  const borderColor = expected ? "#E2E8F0" : "#FECACA";

  return (
    <Box sx={{ p: "24px 16px", bgcolor: GRAY_BG }}>
      <Box
        role="alert"
        sx={{
          maxWidth: "720px",
          bgcolor: tint,
          border: `1px solid ${borderColor}`,
          borderRadius: "12px",
          p: "20px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Box
            sx={{
              width: 24,
              height: 24,
              borderRadius: "50%",
              bgcolor: accent,
              color: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              fontFamily: FONT,
              fontSize: "14px",
              fontWeight: 700,
            }}
          >
            {expected ? "i" : "!"}
          </Box>
          <Typography sx={{ fontFamily: FONT, fontSize: "15px", fontWeight: 700, color: TEXT_DARK }}>
            {title}
          </Typography>
        </Box>

        {message && (
          <Typography
            sx={{
              fontFamily: FONT,
              fontSize: "13px",
              color: TEXT_DARK,
              lineHeight: 1.6,
              whiteSpace: "pre-wrap",
            }}
          >
            {message}
          </Typography>
        )}

        {detail && (
          <Typography sx={{ fontFamily: FONT, fontSize: "12px", color: TEXT_MUTED, lineHeight: 1.6 }}>
            {detail}
          </Typography>
        )}

        {(onRetry || onBack) && (
          <Box sx={{ display: "flex", gap: "8px", mt: "4px" }}>
            {onRetry && (
              <Button
                onClick={onRetry}
                variant="contained"
                disableElevation
                sx={{
                  textTransform: "none",
                  fontFamily: FONT,
                  fontSize: "13px",
                  fontWeight: 600,
                  bgcolor: TEAL,
                  "&:hover": { bgcolor: "#089B98" },
                }}
              >
                Try again
              </Button>
            )}
            {onBack && (
              <Button
                onClick={onBack}
                sx={{
                  textTransform: "none",
                  fontFamily: FONT,
                  fontSize: "13px",
                  color: TEXT_DARK,
                  border: "1px solid #E2E8F0",
                  bgcolor: "#FFFFFF",
                }}
              >
                {backLabel}
              </Button>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default PhaseError;
