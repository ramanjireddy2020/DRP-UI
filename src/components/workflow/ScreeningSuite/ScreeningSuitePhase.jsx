import React, { useEffect, useState } from "react";
import { Box, Typography, Button, LinearProgress } from "@mui/material";
import { FONT, TEAL, GRAY_BG } from "../workflowConstants";
import PhaseActions from "../PhaseActions";
import SharedAgentHeader from "../AgentHeader";
import ScreeningResults from "./ScreeningResults";

/* ============================================================================
   COMMON STYLES
============================================================================ */

/** Minutes without any status / progress change before "taking longer than usual". */
const SLOW_AFTER_MIN = 10;

const baseText = {
  fontFamily: FONT,
  color: "#0F172A",
};

/* ============================================================================
   SCREEN SUITE ICON
============================================================================ */


/* ============================================================================
   AGENT HEADER
============================================================================ */

/**
 * Item T5: the local header is gone. The shared AgentHeader renders the one
 * agreed form for every module — name as written, full agent name beneath.
 */
const AgentHeader = () => <SharedAgentHeader moduleKey="screensuite" />;

/* ============================================================================
   DOCKING TABLE
============================================================================ */

/**
 * @param {object[]} hits - normalised rows from GET /agents/screensuite/{jobId}/hits
 *   (protein, mode, affinity, ligand, outputFile), for runs from before the
 *   staged /results endpoint. Those runs have no interaction profile.
 */
const PLPTable = ({ hits }) => {
  const rows = Array.isArray(hits) ? hits : [];

  // PROTEIN-LIGAND and PROTEIN only render when some row has a value: the API
  // has no field for PROTEIN at all, and outputFile (the PROTEIN-LIGAND
  // source) is "" in the live example, so both columns were always blank.
  const showProteinLigand = rows.some((r) => String(r?.proteinLigand ?? "").trim());
  const showProteinValue = rows.some((r) => String(r?.proteinValue ?? "").trim());

  const gridTemplateColumns = [
    "80px",
    "40px",
    "100px",
    showProteinLigand && "110px",
    showProteinValue && "80px",
    "minmax(150px, 1fr)",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Box
      sx={{
        width: "100%",
        overflowX: "auto",
        border: "1px solid #E2E8F0",
        borderRadius: "8px",
      }}
    >
      <Box sx={{ minWidth: "600px" }}>
        {/* HEADER */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns,
            alignItems: "center",
            columnGap: "4px",
            padding: "10px",
            background: "#F1F5F9",
            borderRadius: "4px",
          }}
        >
          <Typography sx={tableHeader}>PROTEIN NAME</Typography>
          <Typography sx={tableHeader}>MODE</Typography>
          <Typography sx={tableHeader}>
            BINDING AFFINITY (KCAL/MOL)
          </Typography>
          {showProteinLigand && <Typography sx={tableHeader}>PROTEIN-LIGAND</Typography>}
          {showProteinValue && <Typography sx={tableHeader}>PROTEIN</Typography>}
          <Typography sx={tableHeader}>LIGAND</Typography>
        </Box>

        {/* ROWS */}
        {rows.map((row) => (
          <Box
            key={row.id}
            sx={{
              display: "grid",
              gridTemplateColumns,
              alignItems: "center",
              columnGap: "4px",
              padding: "10px",
              minHeight: "41px",
              boxSizing: "border-box",
              background: "#FFFFFF",
              borderTop: "1px solid #EBEDF2",
            }}
          >
            <Typography sx={tableCell}>{row.protein}</Typography>

            <Typography sx={tableCell}>{row.mode}</Typography>

            <Typography sx={tableCell}>{row.affinity}</Typography>

            {showProteinLigand && (
              <Typography
                sx={{
                  ...tableCell,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {row.proteinLigand}
              </Typography>
            )}

            {showProteinValue && (
              <Typography
                sx={{
                  ...tableCell,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {row.proteinValue}
              </Typography>
            )}

            <Typography
              sx={{
                ...tableCell,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {row.ligand}
            </Typography>

          </Box>
        ))}
      </Box>
    </Box>
  );
};

const tableHeader = {
  ...baseText,
  fontSize: "9px",
  lineHeight: "11px",
  fontWeight: 700,
  color: "#33404D",
};

const tableCell = {
  ...baseText,
  fontSize: "10px",
  lineHeight: "12px",
  fontWeight: 400,
  color: "#262B33",
};

/* ============================================================================
   MAIN COMPONENT
============================================================================ */

/**
 * ScreenSuite — molecular docking.
 *
 * The staged backend reports docking and interaction profiling separately
 * (GET /agents/screensuite/{jobId}/results). When `screening` has results,
 * ScreeningResults shows the ranked table, the Mol* 3D view, the ProLIF
 * interaction profile and the downloads. `hits` (the older /hits rows) is
 * only used for runs from before that endpoint existed.
 */
const ScreeningSuitePhase = ({
  workflowPhase,
  progressMessage,
  /** When the docking job started, and when its status / progress last changed. */
  startedAt = null,
  lastChangeAt = null,
  /** Stop waiting on the job (useJob.stop). */
  onStopWaiting,
  hits = [],
  /** normalizeScreening output (usePhaseResults "screensuite"). */
  screening = null,
  /** The ScreenSuite job, for the results / interactions / file endpoints. */
  jobId = null,
  loading = false,
  error = null,
  onRetry,
  unavailable = false,
  unavailableMessage,
  /** Branch / Rerun / Export handlers from usePhaseActions. */
  actions = {},
  /**
   * What CurateX handed over — the ScreenSuite step's selections
   * ({ target, compounds }). Optional: without them the loading screen says
   * nothing about specific candidates rather than naming fixture ones.
   */
  target = null,
  compounds = [],
}) => {
  // A slow clock for the "running for …" line; only ticks while loading.
  const [now, setNow] = useState(() => Date.now());
  const [snoozeUntil, setSnoozeUntil] = useState(null);
  useEffect(() => {
    if (workflowPhase !== "screensuite-loading") return undefined;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, [workflowPhase]);

  // hasData is true even when only legacy /hits data exists (results[] is empty).
  // Only show the staged ScreeningResults panel when there are actual result rows.
  const hasScreening = Boolean(screening?.results?.length);
  const hasHits = !hasScreening && Array.isArray(hits) && hits.length > 0;
  const handedOff = (Array.isArray(compounds) ? compounds : []).filter(Boolean);


  if (workflowPhase === "screensuite-loading") {
    const minutes = (ms) => Math.max(0, Math.floor(ms / 60000));
    const runningFor = startedAt ? minutes(now - startedAt) : null;
    const quietFor = lastChangeAt ? minutes(now - lastChangeAt) : null;
    const slow = quietFor != null && quietFor >= SLOW_AFTER_MIN && !(snoozeUntil && now < snoozeUntil);
    return (
      <Box
        sx={{
          flex: 1,
          width: "100%",
          minWidth: 0,
          height: "100%",
          background: GRAY_BG,
          overflowY: "auto",
          overflowX: "hidden",
          boxSizing: "border-box",
        }}
      >
        <Box
          sx={{
            width: "100%",
            maxWidth: "none",
            margin: 0,
            padding: "24px 40px 40px",
            boxSizing: "border-box",

            "@media (max-width: 700px)": {
              paddingLeft: "16px",
              paddingRight: "16px",
              paddingTop: "16px",
            },
          }}
        >
          <Box
            sx={{
              width: "100%",
              background: "#FFFFFF",
              border: "1px solid #E2E8F0",
              borderRadius: "10px",
              padding: "16px",
              boxSizing: "border-box",
            }}
          >
            <AgentHeader />

            <Typography
              sx={{
                ...baseText,
                fontSize: "14px",
                lineHeight: "22px",
                fontWeight: 400,
                color: "#334155",
                marginBottom: "12px",
              }}
            >
              {progressMessage ||
                "Received candidates from CurateX. Initializing molecular docking pipeline..."}
            </Typography>

            {/* How long it has been running, and — since polling now waits for
                the job's own verdict — a way out when it has gone quiet,
                instead of an open-ended spinner (testing: minutes before
                anything was reported). */}
            {runningFor != null && runningFor >= 1 && (
              <Typography sx={{ ...baseText, fontSize: "12px", lineHeight: "18px", color: "#64748B", marginBottom: "12px" }}>
                Running for {runningFor} min
                {quietFor != null && quietFor >= 1 ? ` · last update ${quietFor} min ago` : ""}
              </Typography>
            )}
            {slow && (
              <Box role="status" sx={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", p: "10px 12px", mb: "12px", borderRadius: "8px", bgcolor: "#FEF3C7", border: "1px solid #FDE68A" }}>
                <Typography sx={{ ...baseText, flex: 1, fontSize: "12px", lineHeight: "18px", color: "#92400E" }}>
                  Docking is taking longer than usual — no update for {quietFor} minutes.
                </Typography>
                <Button
                  size="small"
                  onClick={() => setSnoozeUntil(Date.now() + SLOW_AFTER_MIN * 60000)}
                  sx={{ textTransform: "none", fontSize: "12px", color: "#92400E" }}
                >
                  Keep waiting
                </Button>
                {onStopWaiting && (
                  <Button
                    size="small"
                    onClick={onStopWaiting}
                    sx={{ textTransform: "none", fontSize: "12px", fontWeight: 600, color: "#B91C1C" }}
                  >
                    Stop waiting
                  </Button>
                )}
              </Box>
            )}

            {/* Said up front, because the run is expected to fail here and a
                silent eight-minute wait followed by an error is worse. */}
            {unavailable && (
              <Typography
                sx={{
                  ...baseText,
                  fontSize: "12px",
                  lineHeight: "18px",
                  color: "#B45309",
                  marginBottom: "12px",
                }}
              >
                {unavailableMessage ||
                  "Docking is not expected to succeed on this deployment."}
              </Typography>
            )}

            <Box
              sx={{
                border: "1px solid #F1F5F9",
                borderRadius: "8px",
                padding: "12px",
              }}
            >
              <Typography
                sx={{
                  ...baseText,
                  fontSize: "13px",
                  lineHeight: "16px",
                  fontWeight: 700,
                  color: "#334155",
                  marginBottom: "12px",
                }}
              >
                ⚡ ScreenSuite - Docking Initialization
              </Typography>

              <Box sx={{ ...baseText, fontSize: "11px", color: "#94A3B8", marginBottom: "6px" }}>
                <span>Setting up docking environment...</span>
              </Box>

              {/* The status payload has no percentage, so the bar is
                  indeterminate rather than a fixed 12%. */}
              <LinearProgress
                sx={{
                  height: "5px",
                  borderRadius: "4px",
                  marginBottom: "12px",
                  background: "#F1F5F9",
                  "& .MuiLinearProgress-bar": { background: TEAL },
                }}
              />

              {/* Were fixed "Metformin (94%), Pioglitazone (91%)" and
                  "JAK2 (UniProt: O60674)" lines. Only what was actually handed
                  over is listed. */}
              {[
                handedOff.length
                  ? ["✓", `Candidates received - ${handedOff.join(", ")}`, "#00BCD4"]
                  : null,
                target ? ["✓", `Target - ${target}`, "#00BCD4"] : null,
                ["◉", "Docking in progress", "#00BCD4"],
              ]
                .filter(Boolean)
                .map(([icon, label, color]) => (
                <Box key={label} sx={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "7px" }}>
                  <span style={{ color, fontSize: "11px", width: "10px" }}>{icon}</span>
                  <Typography sx={{ ...baseText, fontSize: "12px", lineHeight: "15px", fontWeight: 500, color: "#334155" }}>
                    {label}
                  </Typography>
                </Box>
              ))}

              {/* The "~8 min" here matched the old 8-second mock timer, not
                  anything the backend reports. There is no estimate in the
                  status payload, so none is shown. */}
            </Box>
          </Box>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        flex: 1,
        width: "100%",
        minWidth: 0,
        height: "100%",
        background: GRAY_BG,
        overflowY: "auto",
        overflowX: "hidden",
        boxSizing: "border-box",
      }}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: "none",
          margin: 0,
          padding: "24px 40px 40px",
          boxSizing: "border-box",

          "@media (max-width: 700px)": {
            paddingLeft: "16px",
            paddingRight: "16px",
            paddingTop: "16px",
          },
        }}
      >
        {/* ================================================================
            MAIN AGENT CARD
        ================================================================= */}

        <Box
          sx={{
            width: "100%",
            background: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: "10px",
            padding: "16px",
            boxSizing: "border-box",
          }}
        >
          <AgentHeader />

          {/* Rows, Mol* and files show as soon as docking completes; a
              background reload (interaction profiling) keeps them on screen
              rather than swapping back to "Loading…". */}
          {hasScreening ? (
            <ScreeningResults jobId={jobId} screening={screening} />
          ) : (
            <>
              <Typography
                sx={{
                  ...baseText,
                  fontSize: "14px",
                  lineHeight: "22px",
                  fontWeight: 400,
                  color: "#334155",
                  marginBottom: "12px",
                }}
              >
                {error
                  ? error
                  : loading
                  ? "Loading docking results…"
                  : hasHits
                  ? `Docking complete. ${hits.length} hit${hits.length === 1 ? "" : "s"} returned.`
                  : "Docking returned no results."}
              </Typography>

              {error && onRetry && (
                <Button
                  onClick={onRetry}
                  sx={{ ...baseText, textTransform: "none", fontSize: "13px", color: TEAL, marginBottom: "12px" }}
                >
                  Try again
                </Button>
              )}

              {/* Older runs only have the /hits affinity rows. */}
              {hasHits && <PLPTable hits={hits} />}

              {!hasHits && !loading && !error && (
                <Box
                  role="alert"
                  sx={{
                    background: "#F8FAFC",
                    border: "1px solid #E2E8F0",
                    borderRadius: "8px",
                    padding: "16px",
                  }}
                >
                  <Typography
                    sx={{ ...baseText, fontSize: "13px", fontWeight: 600, color: "#0F172A", marginBottom: "6px" }}
                  >
                    Docking output is not available
                  </Typography>
                  <Typography sx={{ ...baseText, fontSize: "12px", lineHeight: "18px", color: "#64748B" }}>
                    {unavailable && unavailableMessage
                      ? unavailableMessage
                      : screening?.summary || "No docking results were returned for this run."}
                  </Typography>
                </Box>
              )}
            </>
          )}

          {/* Branch / Rerun / Export — ScreenSuite had none at all. */}
          <Box sx={{ marginTop: "12px" }}>
            <PhaseActions {...actions} />
          </Box>
        </Box>

      </Box>
    </Box>
  );
};

export default ScreeningSuitePhase;