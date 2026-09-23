import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  CircularProgress,
} from "@mui/material";

import {
  ChevronRight,
  EditOutlined,
  Check,
  ArrowForward,
} from "@mui/icons-material";

import {
  getProject,
  getProjectItems,
  updateProject,
  PROJECT_STATUSES,
} from "../../services/api/projects";

import "./ProjectDetails.css";

const WORKFLOW_ROUTE = "/dashboard/new-research/workflow";

/* Friendly section titles for known resultTypes; anything else is shown as-is. */
const RESULT_TYPE_LABELS = {
  targets: "Target Identification",
  literature: "Literature Review",
  articles: "Literature Review",
  candidates: "Candidate Selection",
  compounds: "Candidate Selection",
  screening: "Interaction Screening",
  patents: "Novelty Assessment",
  novelty: "Novelty Assessment",
};

const labelFor = (resultType) =>
  RESULT_TYPE_LABELS[String(resultType || "").toLowerCase()] ||
  (resultType ? String(resultType) : "Other results");

const errorText = (err, fallback) => err?.userMessage || err?.message || fallback;

/* Group items by resultType, keeping first-seen order. */
const groupItems = (items) => {
  const groups = new Map();
  items.forEach((item) => {
    const key = item.resultType || "";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  });
  return [...groups.entries()].map(([resultType, list]) => ({ resultType, items: list }));
};

/* A one-line description for an item, from whatever the payload carries. */
const describeItem = (item) => {
  const p = item.payload || {};
  return p.title || p.summary || p.name || null;
};

/* =========================================================
   PROJECT DETAILS
   ========================================================= */

const ProjectDetails = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notFound, setNotFound] = useState(false);

  const [items, setItems] = useState([]);
  const [itemsError, setItemsError] = useState(null);

  const [reloadKey, setReloadKey] = useState(0);

  /* Edit dialog — PATCH /projects/{id} { name, status } */
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      setNotFound(false);
      setItemsError(null);

      const [projectRes, itemsRes] = await Promise.allSettled([
        getProject(projectId),
        getProjectItems(projectId),
      ]);
      if (!active) return;

      if (projectRes.status === "fulfilled" && projectRes.value) {
        setProject(projectRes.value);
      } else {
        setProject(null);
        const err = projectRes.reason;
        if (projectRes.status === "fulfilled" || err?.status === 404) setNotFound(true);
        else setError(errorText(err, "Failed to load project"));
      }

      if (itemsRes.status === "fulfilled") {
        setItems(Array.isArray(itemsRes.value) ? itemsRes.value : []);
      } else {
        setItems([]);
        setItemsError(errorText(itemsRes.reason, "Failed to load project results"));
      }

      setLoading(false);
    };

    load();

    return () => {
      active = false;
    };
  }, [projectId, reloadKey]);

  const openEdit = () => {
    setEditName(project?.name || "");
    setEditStatus(PROJECT_STATUSES.includes(project?.status) ? project.status : "");
    setSaveError(null);
    setEditOpen(true);
  };

  const handleSave = useCallback(async () => {
    const payload = {};
    if (editName.trim() && editName.trim() !== project?.name) payload.name = editName.trim();
    if (editStatus && editStatus !== project?.status) payload.status = editStatus;
    if (!Object.keys(payload).length) {
      setEditOpen(false);
      return;
    }

    setSaving(true);
    setSaveError(null);
    try {
      const updated = await updateProject(projectId, payload);
      setProject((prev) => ({ ...prev, ...payload, ...(updated || {}) }));
      setEditOpen(false);
    } catch (err) {
      setSaveError(errorText(err, "Failed to update project"));
    } finally {
      setSaving(false);
    }
  }, [editName, editStatus, project, projectId]);

  const openSession = (sessionId) =>
    navigate(WORKFLOW_ROUTE, { state: { sessionId } });

  const renderState = (message, { retry = false } = {}) => (
    <div className="project-details">
      <div className="project-details__content">
        <header className="project-details__breadcrumb">
          <div className="project-details__breadcrumb-left">
            <button
              type="button"
              className="project-details__breadcrumb-text project-details__breadcrumb-button"
              onClick={() => navigate("/dashboard/active-projects")}
            >
              Projects
            </button>
          </div>
        </header>
        <section className="project-details__section">
          <div className="project-details__section-content">
            {message}
            {retry && (
              <Button
                onClick={() => setReloadKey((k) => k + 1)}
                sx={{ textTransform: "none", mt: 1 }}
              >
                Retry
              </Button>
            )}
          </div>
        </section>
      </div>
    </div>
  );

  if (loading) {
    return renderState(<CircularProgress size={20} />);
  }

  if (notFound) {
    return renderState(
      <p>This project doesn&apos;t exist or was deleted.</p>
    );
  }

  if (error || !project) {
    return renderState(
      <p role="alert" style={{ color: "#DC2626" }}>
        Couldn&apos;t load this project: {error || "No data returned"}
      </p>,
      { retry: true }
    );
  }

  const groups = groupItems(items);
  const subtitle = [project.disease, project.module].filter(Boolean).join(" · ");

  return (
    <div className="project-details">
      <div className="project-details__content">

        {/* =====================================================
            BREADCRUMB
        ===================================================== */}

        <header className="project-details__breadcrumb">
          <div className="project-details__breadcrumb-left">

            <button
              type="button"
              className="project-details__breadcrumb-text project-details__breadcrumb-button"
              onClick={() => navigate("/dashboard/active-projects")}
            >
              Projects
            </button>

            <ChevronRight className="project-details__breadcrumb-icon" />

            <span className="project-details__breadcrumb-current">
              {project.name}
            </span>

          </div>

          <div className="project-details__breadcrumb-right">
            <span className="project-details__breadcrumb-text">
              Status
            </span>

            <span className="project-details__breadcrumb-separator">
              /
            </span>

            <span className="project-details__breadcrumb-current">
              <strong>{project.status || "—"}</strong>
            </span>
          </div>
        </header>

        {/* =====================================================
            HEADER
        ===================================================== */}

        <section className="project-details__header">

          <div className="project-details__title-block">

            <Typography
              component="h1"
              className="project-details__title"
            >
              {project.disease
                ? `Repurposing Assessment: ${project.disease}`
                : project.name}
            </Typography>

            <Typography
              component="p"
              className="project-details__subtitle"
            >
              {subtitle || project.name}
            </Typography>

          </div>

          {/* ===================================================
              ACTION BUTTONS
              "Export Project Data" is hidden: the API has no
              project-level export endpoint.
          =================================================== */}

          <div className="project-details__actions">

            <button
              type="button"
              className="project-details__button project-details__edit-button"
              onClick={openEdit}
            >
              <EditOutlined />

              <span>
                Edit Project
              </span>
            </button>

          </div>
        </section>

        {/* =====================================================
            PIPELINE — result types filed into this project
        ===================================================== */}

        {groups.length > 0 && (
          <section className="project-details__pipeline">

            <div className="project-details__pipeline-header">
              <h2 className="project-details__pipeline-title">
                Saved Results
              </h2>
            </div>

            <div className="project-details__pipeline-body">

              <div className="project-details__steps">

                {groups.map((group) => (
                  <div
                    className="project-details__step"
                    key={group.resultType || "other"}
                  >
                    <div className="project-details__step-icon">
                      <Check />
                    </div>

                    <span className="project-details__step-label">
                      {labelFor(group.resultType)} ({group.items.length})
                    </span>
                  </div>
                ))}

              </div>

            </div>
          </section>
        )}

        {/* =====================================================
            CONTENT SECTIONS — GET /projects/{id}/items by resultType
        ===================================================== */}

        <div className="project-details__sections">

          {itemsError && (
            <section className="project-details__section">
              <div className="project-details__section-content">
                <p role="alert" style={{ color: "#DC2626" }}>
                  Couldn&apos;t load this project&apos;s results: {itemsError}
                </p>
              </div>
            </section>
          )}

          {!itemsError && groups.length === 0 && (
            <section className="project-details__section">
              <div className="project-details__section-header">
                <h2 className="project-details__section-title">
                  No results yet
                </h2>
              </div>
              <div className="project-details__section-content">
                <p>
                  Nothing has been filed into this project yet. Use
                  &ldquo;Add to project&rdquo; on a result in a research
                  session to save it here.
                </p>
              </div>
            </section>
          )}

          {groups.map((group) => (
            <section
              className="project-details__section"
              key={group.resultType || "other"}
            >

              <div className="project-details__section-header">
                <h2 className="project-details__section-title">
                  {labelFor(group.resultType)}
                </h2>
              </div>

              <div className="project-details__section-content">
                {group.items.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "12px",
                      padding: "6px 0",
                    }}
                  >
                    <p>
                      {describeItem(item) ||
                        `Saved ${group.resultType || "result"}${
                          item.sessionId ? ` from session ${item.sessionId}` : ""
                        }`}
                    </p>

                    {item.sessionId && (
                      <button
                        type="button"
                        className="project-details__session-link"
                        onClick={() => openSession(item.sessionId)}
                      >
                        <span>
                          View session
                        </span>

                        <ArrowForward />
                      </button>
                    )}
                  </div>
                ))}
              </div>

            </section>
          ))}

        </div>

        <Dialog
          open={editOpen}
          onClose={() => !saving && setEditOpen(false)}
          fullWidth
          maxWidth="xs"
        >
          <DialogTitle sx={{ fontFamily: "'Inter', sans-serif", fontWeight: 700 }}>
            Edit project
          </DialogTitle>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "8px !important" }}>
            <TextField
              label="Project Name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              fullWidth
              size="small"
              autoFocus
            />
            <TextField
              select
              label="Status"
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value)}
              fullWidth
              size="small"
            >
              {PROJECT_STATUSES.map((status) => (
                <MenuItem key={status} value={status}>
                  {status}
                </MenuItem>
              ))}
            </TextField>
            {saveError && (
              <Typography role="alert" sx={{ fontSize: 13, color: "#DC2626" }}>
                {saveError}
              </Typography>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditOpen(false)} disabled={saving} sx={{ textTransform: "none" }}>
              Cancel
            </Button>
            <Button
              variant="contained"
              disableElevation
              onClick={handleSave}
              disabled={saving || !editName.trim()}
              sx={{ textTransform: "none", bgcolor: "#0ABFBC", "&:hover": { bgcolor: "#09ADAB" } }}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogActions>
        </Dialog>
      </div>
    </div>
  );
};

export default ProjectDetails;