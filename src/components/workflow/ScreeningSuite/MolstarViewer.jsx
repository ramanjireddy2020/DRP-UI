import React, { useEffect, useRef, useState } from "react";
import { Box, CircularProgress, Typography } from "@mui/material";
import { FONT } from "../workflowConstants";
import { fetchFileBlob } from "../../../services/api/screensuite";

/**
 * Mol* 3D view of a docked complex.
 *
 * Mol* is loaded on demand from jsDelivr (pinned version) instead of being
 * bundled: it is large, and only this view needs it. The structure is the
 * persisted Vina complex (receptor + ligand), fetched with the bearer token —
 * so the view is available as soon as docking completes and never waits for
 * interaction profiling.
 *
 * `focus` ({ chain, residueNumber }) asks the viewer to highlight and zoom to
 * one residue; that is best-effort and only used when the backend says
 * interaction highlighting is available.
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

/** Best-effort: select and zoom to one residue with Mol*'s script API. */
const focusResidue = async (viewer, { chain, residueNumber }) => {
  const plugin = viewer?.plugin;
  const lib = window.molstar?.lib;
  const MS = lib?.structure?.MolScriptBuilder ?? lib?.MolScriptBuilder;
  const Script = lib?.structure?.Script ?? lib?.Script;
  const StructureSelection = lib?.structure?.StructureSelection ?? lib?.StructureSelection;
  if (!plugin || !MS || !Script || !StructureSelection || residueNumber == null) return false;
  const structure = plugin.managers.structure.hierarchy.current.structures[0]?.cell?.obj?.data;
  if (!structure) return false;
  const expression = MS.struct.generator.atomGroups({
    ...(chain ? { "chain-test": MS.core.rel.eq([MS.struct.atomProperty.macromolecular.auth_asym_id(), chain]) } : {}),
    "residue-test": MS.core.rel.eq([MS.struct.atomProperty.macromolecular.auth_seq_id(), Number(residueNumber)]),
  });
  const selection = Script.getStructureSelection(expression, structure);
  const loci = StructureSelection.toLociWithSourceUnits(selection);
  plugin.managers.interactivity.lociSelects.selectOnly({ loci });
  plugin.managers.camera.focusLoci(loci);
  return true;
};

const MolstarViewer = ({ complexPath, height = 360, focus = null, highlightAvailable = false }) => {
  const hostRef = useRef(null);
  const viewerRef = useRef(null);
  const [state, setState] = useState({ status: "loading", error: null });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading", error: null });

    (async () => {
      try {
        const [molstar, blob] = await Promise.all([loadMolstar(), fetchFileBlob(complexPath)]);
        const text = await blob.text();
        if (cancelled || !hostRef.current) return;
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
    };
  }, [complexPath]);

  useEffect(() => {
    if (state.status !== "ready" || !focus || !highlightAvailable) return;
    focusResidue(viewerRef.current, focus).catch(() => {});
  }, [focus, highlightAvailable, state.status]);

  return (
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
  );
};

export default MolstarViewer;
