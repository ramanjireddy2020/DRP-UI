import React, { useEffect, useState } from "react";
import {
  Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  Radio, TextField, Typography,
} from "@mui/material";
import { listProjects, readProjectList } from "../../services/api/projects";
import { fileSessionResults, setSessionProject } from "../../workflow/sessionStore";

const FONT = "'Geist', sans-serif";
const TEAL = "#00BCD4";
const BORDER = "#E2E8F0";

/**
 * Add a session to a project (testing 2026-10-13: there was no way to add
 * an existing session). The backend has no session → project link, so the
 * session's results are filed into the project (that is what the Project page
 * lists) and the link is remembered for this session in the browser.
 */
const AddToProjectDialog = ({ open, sessionId, sessionTitle = "", onClose, onAdded }) => {
  const [search, setSearch] = useState("");
  const [state, setState] = useState({ loading: false, error: null, items: [] });
  const [picked, setPicked] = useState(null);
  const [saving, setSaving] = useState({ busy: false, error: null });

  useEffect(() => {
    if (!open) return;
    setPicked(null);
    setSaving({ busy: false, error: null });
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    const timer = setTimeout(() => {
      listProjects({ search: search.trim() || undefined, page: 1 })
        .then((payload) => {
          if (!cancelled) setState({ loading: false, error: null, items: readProjectList(payload).items });
        })
        .catch((err) => {
          if (!cancelled) setState({ loading: false, error: err?.userMessage || "Projects could not be loaded.", items: [] });
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, search]);

  const confirm = async () => {
    if (!picked || !sessionId) return;
    setSaving({ busy: true, error: null });
    try {
      setSessionProject(sessionId, { projectId: picked.id, projectName: picked.name });
      const added = await fileSessionResults(picked.id, sessionId);
      setSaving({ busy: false, error: null });
      onAdded?.({ projectId: picked.id, projectName: picked.name, added });
    } catch (err) {
      setSaving({ busy: false, error: err?.userMessage || err?.message || "The session could not be added to the project." });
    }
  };

  return (
    <Dialog open={open} onClose={saving.busy ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontFamily: FONT, fontSize: "18px", fontWeight: 700, color: "#0F172A", pb: "4px" }}>
        Add to project
      </DialogTitle>
      <DialogContent>
        <Typography sx={{ fontFamily: FONT, fontSize: "13px", color: "#64748B", mb: "12px", lineHeight: 1.5 }}>
          {sessionTitle ? <>Add <b>{sessionTitle}</b> to a project. </> : "Add this session to a project. "}
          Its results are filed into the project, and results it produces later are added when you open it.
        </Typography>
        <TextField
          fullWidth
          size="small"
          placeholder="Search projects…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          inputProps={{ style: { fontFamily: FONT, fontSize: "13px" } }}
          sx={{ mb: "10px" }}
        />
        <Box role="radiogroup" aria-label="Projects" sx={{ maxHeight: 280, overflowY: "auto", border: `1px solid ${BORDER}`, borderRadius: "8px" }}>
          {state.loading && (
            <Box sx={{ display: "flex", alignItems: "center", gap: "8px", p: "12px" }}>
              <CircularProgress size={14} sx={{ color: TEAL }} />
              <Typography sx={{ fontFamily: FONT, fontSize: "12px", color: "#64748B" }}>Loading projects…</Typography>
            </Box>
          )}
          {!state.loading && state.error && (
            <Typography role="alert" sx={{ fontFamily: FONT, fontSize: "12px", color: "#B91C1C", p: "12px" }}>{state.error}</Typography>
          )}
          {!state.loading && !state.error && state.items.length === 0 && (
            <Typography sx={{ fontFamily: FONT, fontSize: "12px", color: "#64748B", p: "12px" }}>
              No projects found. Create one on the Projects page first.
            </Typography>
          )}
          {!state.loading &&
            state.items.map((p) => {
              const selected = picked?.id === p.id;
              return (
                <Box
                  key={p.id}
                  onClick={() => setPicked(p)}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    p: "6px 12px 6px 4px",
                    cursor: "pointer",
                    borderBottom: `1px solid ${BORDER}`,
                    "&:last-of-type": { borderBottom: "none" },
                    bgcolor: selected ? "rgba(0,188,212,0.08)" : "transparent",
                  }}
                >
                  <Radio size="small" checked={selected} value={p.id} inputProps={{ "aria-label": p.name }} sx={{ "&.Mui-checked": { color: TEAL } }} />
                  <Typography sx={{ flex: 1, fontFamily: FONT, fontSize: "13px", fontWeight: 600, color: "#0F172A" }}>{p.name}</Typography>
                  {p.disease && <Typography sx={{ fontFamily: FONT, fontSize: "12px", color: "#64748B" }}>{p.disease}</Typography>}
                </Box>
              );
            })}
        </Box>
        {saving.error && (
          <Typography role="alert" sx={{ fontFamily: FONT, fontSize: "12px", color: "#B91C1C", mt: "8px" }}>{saving.error}</Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ px: "24px", pb: "16px" }}>
        <Button onClick={onClose} disabled={saving.busy} sx={{ textTransform: "none", fontFamily: FONT, color: "#0F172A" }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          disableElevation
          disabled={!picked || saving.busy}
          onClick={confirm}
          sx={{ textTransform: "none", fontFamily: FONT, fontWeight: 600, bgcolor: TEAL, "&:hover": { bgcolor: "#00A9BF" } }}
        >
          {saving.busy ? "Adding…" : "Add to project"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddToProjectDialog;
