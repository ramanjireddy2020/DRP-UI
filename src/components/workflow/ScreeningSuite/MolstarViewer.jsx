import React, { useEffect, useRef, useState } from "react";
import { Box, CircularProgress, Typography } from "@mui/material";
import { FONT } from "../workflowConstants";
import { fetchFileBlob } from "../../../services/api/screensuite";
import { drawInteractions, showInteraction, cssColor, colorForType } from "./molstarInteractions";

/**
 * Mol* 3D view of a docked complex.
 *
 * Mol* is loaded on demand from jsDelivr (pinned version) instead of being
 * bundled: it is large, and only this view needs it. The structure is the
 * persisted Vina complex (receptor + ligand), fetched with the bearer token —
 * so the view is available as soon as docking completes and never waits for
 * interaction profiling.
 *
 * `interactions` (normalizeInteractions().list) are the backend's ProLIF
 * profile. Once both the structure and the profile are in, every mappable
 * interaction is drawn (molstarInteractions.js); `selectedInteractionId`
 * selects both partners of one and zooms to it. Without a profile the
 * complex is shown on its own.
 */

const MOLSTAR_VERSION = "4.5.0";
const MOLSTAR_JS = `https://cdn.jsdelivr.net/npm/molstar@${MOLSTAR_VERSION}/build/viewer/molstar.js`;
const MOLSTAR_CSS = `https://cdn.jsdelivr.net/npm/molstar@${MOLSTAR_VERSION}/build/viewer/molstar.css`;

let molstarLoading = null;

/** Load the Mol* viewer bundle once per page. Resolves to window.molstar. */
const loadMolstar = () => {
  if (window.molstar?.Viewer) return Promise.resolve(window.molstar);
  if (molstarLoading) return molstarLoading;
  molstarLoading = new Promise((resolve, reject) => {
    if (!document.querySelector(`link[href="${MOLSTAR_CSS}"]`)) {
      const css = document.createElement("link");
      css.rel = "stylesheet";
      css.href = MOLSTAR_CSS;
      document.head.appendChild(css);
    }
    const script = document.createElement("script");
    script.src = MOLSTAR_JS;
    script.async = true;
    script.onload = () => (window.molstar?.Viewer ? resolve(window.molstar) : reject(new Error("Mol* did not initialise")));
    script.onerror = () => reject(new Error("Mol* could not be loaded"));
    document.head.appendChild(script);
  }).catch((err) => {
    molstarLoading = null;
    throw err;
  });
  return molstarLoading;
};

const MolstarViewer = ({ complexPath, height = 360, interactions = null, selectedInteractionId = null }) => {
  const hostRef = useRef(null);
  const viewerRef = useRef(null);
  const pdbRef = useRef(null);
  const [state, setState] = useState({ status: "loading", error: null });
  // id → { protein, ligand, color } for the interactions drawn in this viewer.
  const [overlay, setOverlay] = useState({ mapped: new Map(), skipped: [], drawing: false });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading", error: null });

    (async () => {
      try {
        const [molstar, blob] = await Promise.all([loadMolstar(), fetchFileBlob(complexPath)]);
        const text = await blob.text();
        if (cancelled || !hostRef.current) return;
        pdbRef.current = text;
        hostRef.current.innerHTML = "";
        const viewer = await molstar.Viewer.create(hostRef.current, {
          layoutIsExpanded: false,
          layoutShowControls: false,
          layoutShowRemoteState: false,
          layoutShowSequence: true,
          layoutShowLog: false,
          layoutShowLeftPanel: false,
          viewportShowExpand: true,
          viewportShowSelectionMode: false,
          viewportShowAnimation: false,
        });
        if (cancelled) {
          viewer.dispose?.();
          return;
        }
        viewerRef.current = viewer;
        await viewer.loadStructureFromData(text, "pdb", { dataLabel: "Docked complex" });
        if (!cancelled) setState({ status: "ready", error: null });
      } catch (err) {
        if (!cancelled) setState({ status: "error", error: err?.message || "The 3D view could not be loaded." });
      }
    })();

    return () => {
      cancelled = true;
      viewerRef.current?.dispose?.();
      viewerRef.current = null;
      pdbRef.current = null;
      setOverlay({ mapped: new Map(), skipped: [], drawing: false });
    };
  }, [complexPath]);

  // Draw the ProLIF interactions once the structure and the profile are both
  // in. A failure here leaves the complex on screen without the overlay.
  useEffect(() => {
    if (state.status !== "ready" || !interactions?.length) return undefined;
    let cancelled = false;
    setOverlay({ mapped: new Map(), skipped: [], drawing: true });
    drawInteractions(viewerRef.current, pdbRef.current, interactions)
      .then((result) => {
        if (!cancelled) setOverlay({ ...result, drawing: false });
      })
      .catch((err) => {
        console.warn("[Mol*] ProLIF interactions could not be drawn:", err);
        if (!cancelled) setOverlay({ mapped: new Map(), skipped: interactions.map((i) => i.id), drawing: false });
      });
    return () => {
      cancelled = true;
    };
  }, [interactions, state.status]);

  // Select and zoom to the chosen interaction (both partners).
  useEffect(() => {
    if (state.status !== "ready" || overlay.drawing) return;
    try {
      showInteraction(viewerRef.current, selectedInteractionId ? overlay.mapped.get(selectedInteractionId) ?? null : null);
    } catch (err) {
      console.warn("[Mol*] Could not show the selected interaction:", err);
    }
  }, [selectedInteractionId, overlay, state.status]);

  // Types actually drawn, for the legend.
  const drawnTypes = [];
  if (interactions?.length) {
    const seen = new Set();
    interactions.forEach((i) => {
      if (overlay.mapped.has(i.id) && !seen.has(i.key)) {
        seen.add(i.key);
        drawnTypes.push({ key: i.key, label: i.label, color: cssColor(colorForType(i.key)) });
      }
    });
  }

  return (
    <Box>
    <Box sx={{ position: "relative", width: "100%", height, borderRadius: "8px", overflow: "hidden", border: "1px solid #E2E8F0", bgcolor: "#FFFFFF" }}>
      <Box ref={hostRef} sx={{ position: "absolute", inset: 0 }} />
      {state.status !== "ready" && (
        <Box sx={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", bgcolor: "#F8FAFC", p: "16px", textAlign: "center" }}>
          {state.status === "loading" ? (
            <>
              <CircularProgress size={16} sx={{ color: "#00BCD4" }} />
              <Typography sx={{ fontFamily: FONT, fontSize: "13px", color: "#64748B" }}>Loading the 3D view…</Typography>
            </>
          ) : (
            <Typography sx={{ fontFamily: FONT, fontSize: "13px", color: "#64748B" }}>
              {state.error} The complex can still be downloaded below.
            </Typography>
          )}
        </Box>
      )}
    </Box>
    {(drawnTypes.length > 0 || overlay.drawing || overlay.skipped.length > 0) && (
      <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "4px 12px", mt: "6px" }}>
        {overlay.drawing && (
          <Typography sx={{ fontFamily: FONT, fontSize: "11px", color: "#64748B" }}>Drawing interactions…</Typography>
        )}
        {drawnTypes.map((t) => (
          <Box key={t.key} sx={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
            <Box sx={{ width: 14, height: 0, borderTop: `2px dashed ${t.color}` }} />
            <Typography sx={{ fontFamily: FONT, fontSize: "11px", color: "#475569" }}>{t.label}</Typography>
          </Box>
        ))}
        {!overlay.drawing && overlay.skipped.length > 0 && (
          <Typography sx={{ fontFamily: FONT, fontSize: "11px", color: "#B45309" }}>
            {overlay.skipped.length} interaction{overlay.skipped.length === 1 ? "" : "s"} could not be placed on this structure
          </Typography>
        )}
      </Box>
    )}
    </Box>
  );
};

export default MolstarViewer;
