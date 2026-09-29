import React, { useEffect, useMemo, useState } from "react";
import { Box, Button, CircularProgress, Typography } from "@mui/material";
import { ExpandMoreRounded, DownloadRounded } from "@mui/icons-material";
import { FONT, TEAL, BORDER, TEXT_DARK, TEXT_MUTED } from "../workflowConstants";
import { getInteractions, downloadFile } from "../../../services/api/screensuite";
import { normalizeInteractions, INTERACTION_TYPES } from "../../../workflow/phaseResults";
import MolstarViewer from "./MolstarViewer";

/**
 * ScreenSuite results, from GET /agents/screensuite/{jobId}/results.
 *
 * Docking and interaction profiling are separate stages: a row appears with
 * its score, 3D view and files as soon as docking completes, and the
 * interaction profile fills in when ProLIF finishes. A failed interaction
 * stage is reported on its row and never hides the docking result.
 */

const text = { fontFamily: FONT, color: TEXT_DARK };

const STATUS_STYLE = {
  completed: { label: "Completed", color: "#15803D", bg: "#DCFCE7" },
  running: { label: "Running", color: "#B45309", bg: "#FEF3C7" },
  pending: { label: "Pending", color: "#B45309", bg: "#FEF3C7" },
  failed: { label: "Failed", color: "#B91C1C", bg: "#FEE2E2" },
  unavailable: { label: "Unavailable", color: "#475569", bg: "#F1F5F9" },
  ambiguous: { label: "Needs structure", color: "#1D4ED8", bg: "#DBEAFE" },
};

const StatusChip = ({ status, title }) => {
  const s = STATUS_STYLE[status] ?? { label: status || "—", color: "#475569", bg: "#F1F5F9" };
  return (
    <Box
      component="span"
      title={title || undefined}
      sx={{ display: "inline-block", px: "8px", py: "2px", borderRadius: "999px", bgcolor: s.bg, color: s.color, fontFamily: FONT, fontSize: "11px", fontWeight: 600, whiteSpace: "nowrap" }}
    >
      {s.label}
    </Box>
  );
};

const PER_RESULT_FILES = [
  { key: "complex", label: "Complex (PDB)", ext: "pdb" },
  { key: "receptor", label: "Receptor (PDB)", ext: "pdb" },
  { key: "docked_pose", label: "Docked pose (PDBQT)", ext: "pdbqt" },
  { key: "docked_pose_sdf", label: "Docked pose (SDF)", ext: "sdf" },
  { key: "interaction_report", label: "Interaction report", ext: "json", needsInteractions: true },
];

const safeName = (s) => String(s ?? "").replace(/[^A-Za-z0-9._-]+/g, "_");

/** A download button that reports 404 as "not available yet" instead of failing silently. */
const DownloadButton = ({ path, filename, label }) => {
  const [state, setState] = useState(null);
  const onClick = async () => {
    setState("busy");
    try {
      await downloadFile(path, filename);
      setState(null);
    } catch (err) {
      setState(err?.response?.status === 404 ? "Not available yet" : "Download failed");
    }
  };
  return (
    <Box sx={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
      <Button
        size="small"
        onClick={onClick}
        disabled={state === "busy"}
        startIcon={state === "busy" ? <CircularProgress size={12} /> : <DownloadRounded sx={{ fontSize: 16 }} />}
        sx={{ textTransform: "none", fontFamily: FONT, fontSize: "12px", color: "#334155", border: `1px solid ${BORDER}`, borderRadius: "8px", px: "10px", bgcolor: "#FFFFFF", "&:hover": { bgcolor: "#F8FAFC" } }}
      >
        {label}
      </Button>
      {state && state !== "busy" && (
        <Typography sx={{ fontFamily: FONT, fontSize: "11px", color: "#B45309" }}>{state}</Typography>
      )}
    </Box>
  );
};

/* ============================================================================
   RESULTS TABLE
============================================================================ */

const COLUMNS = "minmax(90px,1fr) minmax(120px,1.4fr) 130px 56px 110px 110px";

const ResultsTable = ({ results, selectedId, onSelect }) => {
  // Grouped per protein, best (most negative) score first within each.
  const groups = useMemo(() => {
    const map = new Map();
    results.forEach((r) => {
      if (!map.has(r.protein)) map.set(r.protein, []);
      map.get(r.protein).push(r);
    });
    return [...map.entries()].map(([protein, rows]) => [
      protein,
      [...rows].sort((a, b) => (a.rawScore ?? Infinity) - (b.rawScore ?? Infinity)),
    ]);
  }, [results]);

  const head = { ...text, fontSize: "11px", fontWeight: 700, color: "#33404D", textTransform: "uppercase", letterSpacing: "0.02em" };
  const cell = { ...text, fontSize: "13px", color: "#262B33" };

  return (
    <Box sx={{ width: "100%", overflowX: "auto", border: `1px solid ${BORDER}`, borderRadius: "8px" }}>
      <Box sx={{ minWidth: 640 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: COLUMNS, gap: "8px", alignItems: "center", p: "10px 12px", bgcolor: "#F8FAFC", borderBottom: `1px solid ${BORDER}` }}>
          <Typography sx={head}>Protein</Typography>
          <Typography sx={head}>Drug</Typography>
          <Typography sx={head}>Score (kcal/mol)</Typography>
          <Typography sx={head}>Rank</Typography>
          <Typography sx={head}>Docking</Typography>
          <Typography sx={head}>Interactions</Typography>
        </Box>
        {groups.map(([protein, rows]) =>
          rows.map((r, i) => {
            const selected = r.resultId === selectedId;
            return (
              <Box
                key={r.resultId}
                role="button"
                tabIndex={0}
                aria-pressed={selected}
                onClick={() => onSelect(r.resultId)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(r.resultId);
                  }
                }}
                sx={{
                  display: "grid",
                  gridTemplateColumns: COLUMNS,
                  gap: "8px",
                  alignItems: "center",
                  p: "10px 12px",
                  cursor: "pointer",
                  borderBottom: `1px solid ${BORDER}`,
                  "&:last-of-type": { borderBottom: "none" },
                  bgcolor: selected ? "rgba(0,188,212,0.08)" : "#FFFFFF",
                  boxShadow: selected ? `inset 3px 0 0 ${TEAL}` : "none",
                  "&:hover": { bgcolor: selected ? "rgba(0,188,212,0.1)" : "#F8FAFC" },
                }}
              >
                <Typography sx={{ ...cell, fontWeight: 600 }}>
                  {i === 0 ? protein : ""}
                  {i === 0 && r.proteinIdentifier && (
                    <Box component="span" sx={{ display: "block", fontSize: "11px", fontWeight: 400, color: TEXT_MUTED }}>
                      {r.proteinIdentifier}
                    </Box>
                  )}
                </Typography>
                <Typography sx={{ ...cell, textTransform: "capitalize" }}>{r.drug}</Typography>
                <Typography sx={{ ...cell, fontVariantNumeric: "tabular-nums" }}>{r.score}</Typography>
                <Typography sx={cell}>{r.rank ?? i + 1}</Typography>
                <Box><StatusChip status={r.stages.docking.status} title={r.stages.docking.error} /></Box>
                <Box><StatusChip status={r.stages.interaction.status} title={r.stages.interaction.error} /></Box>
              </Box>
            );
          })
        )}
      </Box>
    </Box>
  );
};

/* ============================================================================
   INTERACTION PANEL
============================================================================ */

const InteractionPanel = ({ jobId, result, onFocus, focus }) => {
  const status = result.stages.interaction.status;
  const [state, setState] = useState({ loading: false, error: null, data: null });
  const [open, setOpen] = useState(null);

  useEffect(() => {
    setOpen(null);
    if (status !== "completed" || !jobId) {
      setState({ loading: false, error: null, data: null });
      return undefined;
    }
    let cancelled = false;
    setState({ loading: true, error: null, data: null });
    getInteractions(jobId, result.resultId)
      .then((payload) => {
        if (!cancelled) setState({ loading: false, error: null, data: normalizeInteractions(payload) });
      })
      .catch((err) => {
        if (!cancelled) setState({ loading: false, error: err?.userMessage || err?.message || "The interaction profile could not be loaded.", data: null });
      });
    return () => {
      cancelled = true;
    };
  }, [jobId, result.resultId, status]);

  const note = (title, body, color = TEXT_MUTED) => (
    <Box sx={{ p: "14px", border: `1px solid ${BORDER}`, borderRadius: "8px", bgcolor: "#F8FAFC" }}>
      <Typography sx={{ ...text, fontSize: "13px", fontWeight: 600, mb: "4px" }}>{title}</Typography>
      <Typography sx={{ ...text, fontSize: "12px", lineHeight: "18px", color }}>{body}</Typography>
    </Box>
  );

  if (status === "pending" || status === "running") {
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: "10px", p: "14px", border: `1px solid ${BORDER}`, borderRadius: "8px", bgcolor: "#F8FAFC" }}>
        <CircularProgress size={14} sx={{ color: TEAL }} />
        <Typography sx={{ ...text, fontSize: "12px", color: "#475569" }}>
          Profiling protein–ligand interactions… The docking score, 3D view and files are ready now.
        </Typography>
      </Box>
    );
  }
  if (status === "failed") {
    return note("Interaction profiling failed", result.stages.interaction.error || "ProLIF could not profile this pose. The docking result is still valid.", "#B91C1C");
  }
  if (status === "unavailable") {
    return note("No interaction profile", result.stages.interaction.error || "Interaction profiling is not available for this result.");
  }
  if (state.loading) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: "10px", p: "14px" }}>
        <CircularProgress size={14} sx={{ color: TEAL }} />
        <Typography sx={{ ...text, fontSize: "12px", color: "#475569" }}>Loading the interaction profile…</Typography>
      </Box>
    );
  }
  if (state.error) return note("Interaction profile not loaded", state.error, "#B91C1C");
  const data = state.data;
  if (!data) return null;
  if (data.status === "failed") return note("Interaction profiling failed", data.error || "ProLIF could not profile this pose.", "#B91C1C");
  if (!data.total) return note("No interactions detected", "ProLIF found no protein–ligand interactions for this pose.");

  const types = INTERACTION_TYPES.filter(({ key }) => data.counts[key] > 0 || data.byType[key].length > 0);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <Typography sx={{ ...text, fontSize: "13px", fontWeight: 600 }}>
        {data.total} interaction{data.total === 1 ? "" : "s"}
        {data.residues.length ? ` across ${data.residues.length} residue${data.residues.length === 1 ? "" : "s"}` : ""}
        {data.version && (
          <Box component="span" sx={{ fontWeight: 400, color: TEXT_MUTED, fontSize: "11px" }}> · ProLIF {data.version}</Box>
        )}
      </Typography>

      <Box sx={{ border: `1px solid ${BORDER}`, borderRadius: "8px", overflow: "hidden" }}>
        {types.map(({ key, label }) => {
          const rows = data.byType[key];
          const expanded = open === key;
          return (
            <Box key={key} sx={{ borderBottom: `1px solid ${BORDER}`, "&:last-of-type": { borderBottom: "none" } }}>
              <Box
                role="button"
                tabIndex={0}
                aria-expanded={expanded}
                onClick={() => setOpen(expanded ? null : key)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setOpen(expanded ? null : key);
                  }
                }}
                sx={{ display: "flex", alignItems: "center", gap: "8px", p: "8px 12px", cursor: "pointer", bgcolor: expanded ? "#F8FAFC" : "#FFFFFF", "&:hover": { bgcolor: "#F8FAFC" } }}
              >
                <Typography sx={{ ...text, flex: 1, fontSize: "13px", fontWeight: 500 }}>{label}</Typography>
                <Typography sx={{ ...text, fontSize: "13px", fontWeight: 700, color: TEAL }}>{data.counts[key]}</Typography>
                <ExpandMoreRounded sx={{ fontSize: 18, color: TEXT_MUTED, transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
              </Box>
              {expanded && (
                <Box sx={{ p: "4px 12px 10px" }}>
                  <Box sx={{ display: "grid", gridTemplateColumns: "1.2fr 0.6fr 0.8fr 0.8fr", gap: "6px", py: "4px" }}>
                    {["Residue", "Chain", "Distance (Å)", "Angle (°)"].map((h) => (
                      <Typography key={h} sx={{ ...text, fontSize: "11px", fontWeight: 700, color: "#33404D" }}>{h}</Typography>
                    ))}
                  </Box>
                  {rows.map((row) => {
                    const focused = focus && focus.residueNumber === row.residueNumber && focus.chain === row.chain;
                    return (
                      <Box
                        key={row.id}
                        onClick={() => onFocus?.({ chain: row.chain, residueNumber: row.residueNumber })}
                        title={[row.proteinAtoms.length && `Protein atoms: ${row.proteinAtoms.join(", ")}`, row.ligandAtoms.length && `Ligand atoms: ${row.ligandAtoms.join(", ")}`].filter(Boolean).join("\n") || undefined}
                        sx={{ display: "grid", gridTemplateColumns: "1.2fr 0.6fr 0.8fr 0.8fr", gap: "6px", py: "4px", borderTop: "1px solid #F1F5F9", cursor: onFocus ? "pointer" : "default", bgcolor: focused ? "rgba(0,188,212,0.08)" : "transparent" }}
                      >
                        <Typography sx={{ ...text, fontSize: "12px", fontWeight: 600 }}>{row.residue || "—"}</Typography>
                        <Typography sx={{ ...text, fontSize: "12px" }}>{row.chain || "—"}</Typography>
                        <Typography sx={{ ...text, fontSize: "12px", fontVariantNumeric: "tabular-nums" }}>{row.distance != null ? row.distance.toFixed(2) : "—"}</Typography>
                        <Typography sx={{ ...text, fontSize: "12px", fontVariantNumeric: "tabular-nums" }}>{row.angle != null ? row.angle.toFixed(1) : "—"}</Typography>
                      </Box>
                    );
                  })}
                  {!rows.length && (
                    <Typography sx={{ ...text, fontSize: "12px", color: TEXT_MUTED, py: "4px" }}>
                      Counted, but no per-residue detail was returned.
                    </Typography>
                  )}
                </Box>
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

/* ============================================================================
   SCREENING RESULTS
============================================================================ */

const ScreeningResults = ({ jobId, screening }) => {
  const results = useMemo(() => screening?.results ?? [], [screening]);
  const bestId = useMemo(() => {
    const scored = results.filter((r) => r.rawScore != null);
    if (!scored.length) return results[0]?.resultId ?? null;
    return scored.reduce((best, r) => (r.rawScore < best.rawScore ? r : best)).resultId;
  }, [results]);
  const [selectedId, setSelectedId] = useState(null);
  const [focus, setFocus] = useState(null);
  const selected = results.find((r) => r.resultId === selectedId) ?? results.find((r) => r.resultId === bestId) ?? null;

  useEffect(() => setFocus(null), [selected?.resultId]);

  const filePath = (r, key) => r.files[key] || (jobId ? `/agents/screensuite/${jobId}/results/${r.resultId}/files/${key}` : null);
  const jobFiles = [
    { label: "Affinity table (CSV)", path: screening?.files?.affinityTable || (jobId ? `/agents/screensuite/${jobId}/files/affinity_table` : null), filename: `screening_${safeName(jobId)}_affinities.csv` },
    { label: "Download bundle", path: screening?.files?.bundle || (jobId ? `/agents/screensuite/${jobId}/files/bundle` : null), filename: `screening_${safeName(jobId)}_bundle.zip` },
  ].filter((f) => f.path);

  const failures = screening?.failures ?? [];
  const proteins = new Set(results.map((r) => r.protein)).size;
  const drugs = new Set(results.map((r) => r.drug)).size;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      <Typography sx={{ ...text, fontSize: "14px", lineHeight: "22px", color: "#334155" }}>
        Docking complete: {results.length} result{results.length === 1 ? "" : "s"} for {proteins} protein{proteins === 1 ? "" : "s"} × {drugs} drug{drugs === 1 ? "" : "s"}.
        {!screening?.interactionsDone && " Interaction profiling is still running — profiles appear as they finish."}
        {" "}Lower (more negative) scores bind more strongly. Select a row to see its 3D pose and interactions.
      </Typography>

      <ResultsTable results={results} selectedId={selected?.resultId ?? null} onSelect={setSelectedId} />

      {failures.length > 0 && (
        <Box role="status" sx={{ p: "10px 12px", borderRadius: "8px", bgcolor: "#FEF2F2", border: "1px solid #FECACA" }}>
          <Typography sx={{ ...text, fontSize: "12px", fontWeight: 600, color: "#991B1B", mb: "4px" }}>
            {failures.length} combination{failures.length === 1 ? "" : "s"} could not be docked
          </Typography>
          {failures.map((f, i) => (
            <Typography key={i} sx={{ ...text, fontSize: "12px", lineHeight: "18px", color: "#991B1B" }}>
              {[f.protein, f.drug].filter(Boolean).join(" × ") || "Unknown"}
              {f.stage ? ` (${f.stage})` : ""}: {f.error}
            </Typography>
          ))}
        </Box>
      )}

      {selected && (
        <Box sx={{ border: `1px solid ${BORDER}`, borderRadius: "10px", p: "14px", bgcolor: "#FFFFFF", display: "flex", flexDirection: "column", gap: "12px" }}>
          <Typography sx={{ ...text, fontSize: "14px", fontWeight: 600 }}>
            {selected.protein} × <Box component="span" sx={{ textTransform: "capitalize" }}>{selected.drug}</Box>
            <Box component="span" sx={{ fontWeight: 400, color: TEXT_MUTED, fontSize: "12px" }}>
              {" "}· {selected.score} kcal/mol{selected.proteinIdentifier ? ` · ${selected.proteinIdentifier}` : ""}
              {selected.proteinSource ? ` (${selected.proteinSource})` : ""}
            </Box>
          </Typography>

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "minmax(0,1.2fr) minmax(0,1fr)" }, gap: "14px" }}>
            <Box sx={{ minWidth: 0 }}>
              {selected.molstar.available && selected.molstar.complex ? (
                <MolstarViewer
                  complexPath={selected.molstar.complex}
                  focus={focus}
                  highlightAvailable={selected.molstar.interactionHighlighting || selected.stages.interaction.status === "completed"}
                />
              ) : (
                <Box sx={{ p: "14px", border: `1px solid ${BORDER}`, borderRadius: "8px", bgcolor: "#F8FAFC" }}>
                  <Typography sx={{ ...text, fontSize: "12px", color: TEXT_MUTED }}>
                    No 3D structure is available for this result.
                  </Typography>
                </Box>
              )}
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <InteractionPanel jobId={jobId} result={selected} focus={focus} onFocus={setFocus} />
            </Box>
          </Box>

          <Box sx={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {PER_RESULT_FILES.filter((f) => !f.needsInteractions || selected.stages.interaction.status === "completed").map((f) => {
              const path = filePath(selected, f.key);
              return path ? (
                <DownloadButton
                  key={`${selected.resultId}-${f.key}`}
                  path={path}
                  label={f.label}
                  filename={`${safeName(selected.protein)}_${safeName(selected.drug)}_${f.key}.${f.ext}`}
                />
              ) : null;
            })}
          </Box>
        </Box>
      )}

      {jobFiles.length > 0 && (
        <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px" }}>
          <Typography sx={{ ...text, fontSize: "12px", fontWeight: 600, color: "#475569" }}>Whole screening:</Typography>
          {jobFiles.map((f) => (
            <DownloadButton key={f.label} path={f.path} label={f.label} filename={f.filename} />
          ))}
        </Box>
      )}
    </Box>
  );
};

export default ScreeningResults;
