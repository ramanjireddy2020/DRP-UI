import React, { useCallback, useEffect, useState } from "react";
import { Box, Typography, Button, CircularProgress } from "@mui/material";
import { getArtifacts } from "../../services/api/sessions";
import exportsApi from "../../services/api/exports";
import projectsApi from "../../services/api/projects";
import "./ArtifactsPage.css";

/**
 * The session's artifacts — GET /sessions/{id}/artifacts, one per completed
 * step: [{ id, stepId, jobId, module, title, resultType, summary, createdAt,
 * exportable }].
 *
 * This used to be a fixed TP53 / EGFR / TNF shortlist and a "Generate report"
 * button with no handler, the same for every session.
 */

/** ISO-8601 date (YYYY-MM-DD, UTC) for an API timestamp. */
const isoDate = (value) => {
  if (!value) return null;
  // The API's timestamps carry no zone; they are UTC.
  const text = String(value);
  const date = new Date(/[zZ]|[+-]\d{2}:?\d{2}$/.test(text) ? text : `${text}Z`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
};

const buttonSx = {
  bgcolor: "#00BCD4",
  color: "#FFFFFF",
  textTransform: "none",
  "&:hover": { bgcolor: "#089B98" },
};

const ArtifactsPage = ({ sessionId = null, projectId = null, refreshKey = 0, onLoaded }) => {
  const [artifacts, setArtifacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);
  /** Per-artifact action state: { [artifactId]: { busy, message, isError } } */
  const [actionState, setActionState] = useState({});

  useEffect(() => {
    if (!sessionId) {
      setArtifacts([]);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    getArtifacts(sessionId)
      .then((payload) => {
        if (cancelled) return;
        const list = Array.isArray(payload) ? payload : Array.isArray(payload?.items) ? payload.items : [];
        setArtifacts(list);
        setLoading(false);
        onLoaded?.(list);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.userMessage || err?.message || "The artifacts could not be loaded.");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // onLoaded is a notification only; re-fetching when its identity changes
    // would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, refreshKey, attempt]);

  const setAction = (id, patch) =>
    setActionState((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  /** POST /exports/pdf for this artifact's job, then the authenticated download. */
  const handleReport = useCallback(async (artifact) => {
    setAction(artifact.id, { busy: "report", message: null, isError: false });
    try {
      const response = await exportsApi.createPdfExport(artifact.jobId);
      const downloadUrl = response?.downloadUrl ?? response?.download_url;
      if (!downloadUrl) throw new Error("The report did not return a download link.");
      const name = `${String(artifact.module || "drp").toLowerCase()}-${artifact.jobId}.pdf`;
      await exportsApi.downloadExport(downloadUrl, name);
      setAction(artifact.id, { busy: null, message: "Report downloaded.", isError: false });
    } catch (err) {
      setAction(artifact.id, {
        busy: null,
        message: err?.userMessage || err?.message || "The report could not be generated.",
        isError: true,
      });
    }
  }, []);

  /** POST /projects/{id}/results — file this result into the session's project. */
  const handleAddToProject = useCallback(
    async (artifact) => {
      setAction(artifact.id, { busy: "project", message: null, isError: false });
      try {
        const response = await projectsApi.addProjectResult(projectId, {
          sessionId,
          resultId: artifact.jobId,
          resultType: artifact.resultType,
        });
        if (response?.success === false) {
          throw new Error(response?.message || "The project did not accept this result.");
        }
        setAction(artifact.id, {
          busy: null,
          message: response?.projectName ? `Added to ${response.projectName}.` : "Added to the project.",
          isError: false,
        });
      } catch (err) {
        setAction(artifact.id, {
          busy: null,
          message: err?.userMessage || err?.message || "The result could not be added to the project.",
          isError: true,
        });
      }
    },
    [projectId, sessionId]
  );

  if (!sessionId) {
    return (
      <Box className="artifacts-root">
        <Box className="artifact-card">
          <Typography className="artifact-note">There is no session yet, so there are no artifacts.</Typography>
        </Box>
      </Box>
    );
  }

  if (loading && !artifacts.length) {
    return (
      <Box className="artifacts-root">
        <Box className="artifact-card" sx={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <CircularProgress size={16} sx={{ color: "#00BCD4" }} />
          <Typography className="artifact-note">Loading artifacts…</Typography>
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box className="artifacts-root">
        <Box className="artifact-card">
          <Typography role="alert" sx={{ color: "#DC2626", fontSize: "13px", mb: 1 }}>
            {error}
          </Typography>
          <Button onClick={() => setAttempt((n) => n + 1)} sx={{ textTransform: "none", color: "#00BCD4" }}>
            Try again
          </Button>
        </Box>
      </Box>
    );
  }

  if (!artifacts.length) {
    return (
      <Box className="artifacts-root">
        <Box className="artifact-card">
          <Typography className="artifact-note">
            No artifacts yet. Each step adds one here when it completes.
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box className="artifacts-root">
      {artifacts.map((artifact) => {
        const state = actionState[artifact.id] || {};
        const created = isoDate(artifact.createdAt);
        return (
          <Box key={artifact.id} className="artifact-card">
            <Typography className="artifact-title">
              {[artifact.module, artifact.resultType].filter(Boolean).join(" · ")}
            </Typography>
            <Typography className="artifact-subtitle">{artifact.title || "Untitled result"}</Typography>

            {artifact.summary && (
              <Box className="artifact-recommendation">
                <Typography className="artifact-rec-body">{artifact.summary}</Typography>
              </Box>
            )}

            {created && (
              <Typography className="artifact-note" sx={{ mt: 1 }}>
                Created {created}
              </Typography>
            )}

            <Box sx={{ mt: 2, display: "flex", gap: "10px", flexWrap: "wrap" }}>
              {artifact.exportable && artifact.jobId && (
                <Button
                  variant="contained"
                  disabled={Boolean(state.busy)}
                  onClick={() => handleReport(artifact)}
                  sx={buttonSx}
                >
                  {state.busy === "report" ? "Generating…" : "Generate report"}
                </Button>
              )}
              {/* Only offered when the session belongs to a project. */}
              {projectId && artifact.jobId && (
                <Button
                  variant="outlined"
                  disabled={Boolean(state.busy)}
                  onClick={() => handleAddToProject(artifact)}
                  sx={{ textTransform: "none", color: "#0F172A", borderColor: "#E2E8F0" }}
                >
                  {state.busy === "project" ? "Adding…" : "Add to project"}
                </Button>
              )}
            </Box>

            {state.message && (
              <Typography
                role={state.isError ? "alert" : "status"}
                sx={{ fontSize: "12px", mt: 1, color: state.isError ? "#DC2626" : "#059669" }}
              >
                {state.message}
              </Typography>
            )}
          </Box>
        );
      })}
    </Box>
  );
};

export default ArtifactsPage;
