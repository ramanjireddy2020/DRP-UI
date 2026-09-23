import React from "react";
import { Box, Typography, CircularProgress, LinearProgress } from "@mui/material";
import { FONT, GRAY_BG, TEXT_DARK, TEXT_MUTED, TEAL, BORDER } from "./workflowConstants";

/**
 * The whole-pipeline run: TxKG → LitMineX → CurateX → ScreenSuite → NovSearch
 * as one job.
 *
 * This screen exists because the supervisor really can return
 * `module: "SaaS Pipeline"` — a valid response the UI previously rejected as an
 * unrecognised module, which stopped the run before it started.
 *
 * A pipeline run needs its own view rather than one of the five phase screens
 * because a failing stage does not stop the job: the job's own status says
 * "completed" while the stage list says 4 of 5. The per-stage breakdown is the
 * only honest summary, so that is what is rendered.
 */

const STATUS_STYLES = {
  completed: { bg: "#D1FAE5", text: "#059669", label: "Completed" },
  failed: { bg: "#FEE2E2", text: "#DC2626", label: "Failed" },
  running: { bg: "#FEF3C7", text: "#B45309", label: "Running" },
  "in progress": { bg: "#FEF3C7", text: "#B45309", label: "In progress" },
};

const styleFor = (status) =>
  STATUS_STYLES[String(status ?? "").toLowerCase()] ?? {
    bg: "#F1F5F9",
    text: "#64748B",
    label: status || "Pending",
  };

const PipelinePhase = ({ workflowPhase, pipeline, progressMessage, query }) => {
  const isLoading = workflowPhase === "pipeline-loading";

  // The job can report "completed" while a stage failed; the stage list is
  // what decides whether this reads as a clean finish.
  const hasFailures =
    pipeline?.hasFailures ?? Boolean(pipeline?.stages?.some((s) => s.failed));

  return (
    <Box sx={{ p: "24px 16px", bgcolor: GRAY_BG }}>
      <Box sx={{ maxWidth: "820px", display: "flex", flexDirection: "column", gap: "16px" }}>
        {query && (
          <Typography sx={{ fontFamily: FONT, fontSize: "13px", color: TEXT_MUTED }}>
            {query}
          </Typography>
        )}

        <Box
          sx={{
            bgcolor: "#FFFFFF",
            border: `1px solid ${BORDER}`,
            borderRadius: "12px",
            p: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {isLoading && <CircularProgress size={16} sx={{ color: TEAL }} />}
            <Typography sx={{ fontFamily: FONT, fontSize: "15px", fontWeight: 700, color: TEXT_DARK }}>
              {isLoading
                ? "Running the full repurposing pipeline"
                : hasFailures
                ? "Pipeline finished with failures"
                : "Pipeline finished"}
            </Typography>

            {!isLoading && pipeline?.hasData && (
              <Box
                sx={{
                  ml: "auto",
                  bgcolor: hasFailures ? "#FEF3C7" : "#D1FAE5",
                  borderRadius: "6px",
                  px: "8px",
                  py: "3px",
                }}
              >
                <Typography
                  sx={{
                    fontFamily: FONT,
                    fontSize: "11px",
                    fontWeight: 700,
                    color: hasFailures ? "#B45309" : "#059669",
                  }}
                >
                  {hasFailures ? "Partial" : "Completed"}
                </Typography>
              </Box>
            )}
          </Box>

          {/* The runner's own progress line — the only feedback a multi-minute
              job gives while it works. */}
          {isLoading && (
            <>
              <Typography sx={{ fontFamily: FONT, fontSize: "13px", color: TEXT_MUTED }}>
                {progressMessage || "Waiting for the first stage to report…"}
              </Typography>
              <LinearProgress
                sx={{
                  height: 4,
                  borderRadius: 2,
                  bgcolor: "#E2E8F0",
                  "& .MuiLinearProgress-bar": { bgcolor: TEAL },
                }}
              />
            </>
          )}

          {!isLoading && pipeline?.summary && (
            <Typography sx={{ fontFamily: FONT, fontSize: "13px", color: TEXT_DARK, lineHeight: 1.6 }}>
              {pipeline.summary}
            </Typography>
          )}

          {!isLoading && pipeline?.hasData && (
            <Typography sx={{ fontFamily: FONT, fontSize: "12px", color: TEXT_MUTED }}>
              {pipeline.completed} of {pipeline.total} stage
              {pipeline.total === 1 ? "" : "s"} completed
            </Typography>
          )}
        </Box>

        {pipeline?.hasData && (
          <Box
            sx={{
              bgcolor: "#FFFFFF",
              border: `1px solid ${BORDER}`,
              borderRadius: "12px",
              overflow: "hidden",
            }}
          >
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "32px minmax(140px,1fr) 120px",
                gap: "8px",
                px: "16px",
                py: "10px",
                bgcolor: "#F8FAFC",
                borderBottom: `1px solid ${BORDER}`,
              }}
            >
              {["#", "Stage", "Status"].map((h) => (
                <Typography
                  key={h}
                  sx={{
                    fontFamily: FONT,
                    fontSize: "11px",
                    fontWeight: 700,
                    color: TEXT_MUTED,
                    textTransform: "uppercase",
                  }}
                >
                  {h}
                </Typography>
              ))}
            </Box>

            {pipeline.stages.map((stage, idx) => {
              const s = styleFor(stage.status);
              return (
                <Box
                  key={`${stage.module}-${idx}`}
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "32px minmax(140px,1fr) 120px",
                    gap: "8px",
                    px: "16px",
                    py: "12px",
                    alignItems: "center",
                    borderBottom:
                      idx < pipeline.stages.length - 1 ? `1px solid ${BORDER}` : "none",
                  }}
                >
                  <Typography sx={{ fontFamily: FONT, fontSize: "12px", color: TEXT_MUTED }}>
                    {String(idx + 1).padStart(2, "0")}
                  </Typography>

                  <Box>
                    <Typography
                      sx={{ fontFamily: FONT, fontSize: "13px", fontWeight: 600, color: TEXT_DARK }}
                    >
                      {stage.module}
                    </Typography>
                    {stage.summary && (
                      <Typography sx={{ fontFamily: FONT, fontSize: "11px", color: TEXT_MUTED }}>
                        {stage.summary}
                      </Typography>
                    )}
                  </Box>

                  <Box
                    sx={{
                      bgcolor: s.bg,
                      borderRadius: "6px",
                      px: "8px",
                      py: "3px",
                      textAlign: "center",
                      justifySelf: "start",
                    }}
                  >
                    <Typography
                      sx={{ fontFamily: FONT, fontSize: "11px", fontWeight: 700, color: s.text }}
                    >
                      {s.label}
                    </Typography>
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}

        {/* Docking cannot run on this deployment, so a 4-of-5 pipeline is the
            expected outcome rather than a fault. Saying so here stops it
            reading as a bug. */}
        {!isLoading && hasFailures && (
          <Typography sx={{ fontFamily: FONT, fontSize: "12px", color: TEXT_MUTED, lineHeight: 1.6 }}>
            A failing stage does not stop the run. ScreenSuite is expected to fail on this
            deployment — PyMOL and Vina cannot be installed on Databricks Apps.
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default PipelinePhase;
