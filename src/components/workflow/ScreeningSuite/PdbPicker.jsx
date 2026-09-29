import React, { useState } from "react";
import { Box, Button, Radio, Typography } from "@mui/material";
import { FONT, TEAL, BORDER, TEXT_DARK, TEXT_MUTED } from "../workflowConstants";
import { rcsbUrl } from "../../../workflow/pdbShortlist";

/**
 * "Pick a structure to dock against" — the ScreenSuite PDB shortlist as a
 * choice rather than an error. The backend returns the options for every
 * protein that needs one (each option carries its `protein`), so they are
 * grouped per protein and one structure is picked for each. Choosing
 * continues docking with `{ pdbId, structures: { protein: pdbId } }`.
 */
const groupByProtein = (options, fallback) => {
  const groups = new Map();
  options.forEach((o) => {
    const key = o.protein || fallback || "Target";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(o);
  });
  return [...groups.entries()];
};

const PdbPicker = ({ target, options, onPick, pending = false, message = null }) => {
  const groups = groupByProtein(options, target);
  const [picked, setPicked] = useState(() =>
    Object.fromEntries(groups.map(([protein, list]) => [protein, list[0]?.id ?? null]))
  );
  const allPicked = groups.every(([protein]) => picked[protein]);
  const firstPick = picked[groups[0]?.[0]] ?? null;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "12px", p: "16px", border: `1px solid ${BORDER}`, borderRadius: "10px", bgcolor: "#FFFFFF" }}>
      <Typography sx={{ fontFamily: FONT, fontSize: "15px", fontWeight: 600, color: TEXT_DARK }}>
        {groups.length > 1 ? "Choose a protein structure for each target" : `Choose a protein structure${groups[0]?.[0] ? ` for ${groups[0][0]}` : ""}`}
      </Typography>
      <Typography sx={{ fontFamily: FONT, fontSize: "13px", color: TEXT_MUTED, lineHeight: 1.5 }}>
        {message ||
          "More than one PDB structure matches. Pick the one to dock against."}
      </Typography>

      {groups.map(([protein, list]) => (
        <Box key={protein} sx={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {groups.length > 1 && (
            <Typography sx={{ fontFamily: FONT, fontSize: "13px", fontWeight: 600, color: TEXT_DARK }}>{protein}</Typography>
          )}
          <Box role="radiogroup" aria-label={`PDB structures for ${protein}`} sx={{ border: `1px solid ${BORDER}`, borderRadius: "8px", overflow: "hidden" }}>
            {list.map((o) => {
              const checked = picked[protein] === o.id;
              return (
                <Box
                  key={o.id}
                  onClick={() => setPicked((prev) => ({ ...prev, [protein]: o.id }))}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    p: "6px 12px 6px 4px",
                    cursor: "pointer",
                    borderBottom: `1px solid ${BORDER}`,
                    "&:last-of-type": { borderBottom: "none" },
                    bgcolor: checked ? "rgba(0,188,212,0.08)" : "transparent",
                  }}
                >
                  <Radio size="small" checked={checked} value={o.id} inputProps={{ "aria-label": `${protein} ${o.id}` }} sx={{ "&.Mui-checked": { color: TEAL } }} />
                  <Typography sx={{ fontFamily: FONT, fontSize: "13px", fontWeight: 700, color: TEXT_DARK, minWidth: 48 }}>{o.id}</Typography>
                  <Typography sx={{ flex: 1, fontFamily: FONT, fontSize: "12px", color: TEXT_MUTED }}>
                    {[o.title, o.method, o.resolution != null && `${o.resolution} Å`].filter(Boolean).join(" · ") || "PDB structure"}
                  </Typography>
                  <Typography
                    component="a"
                    href={rcsbUrl(o.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    sx={{ fontFamily: FONT, fontSize: "12px", color: TEAL, textDecoration: "none", "&:hover": { textDecoration: "underline" } }}
                  >
                    RCSB ↗
                  </Typography>
                </Box>
              );
            })}
          </Box>
        </Box>
      ))}

      <Button
        variant="contained"
        disableElevation
        disabled={!allPicked || pending}
        onClick={() => onPick({ pdbId: firstPick, structures: picked })}
        sx={{ alignSelf: "flex-start", textTransform: "none", fontFamily: FONT, fontWeight: 600, bgcolor: TEAL, "&:hover": { bgcolor: "#089B98" } }}
      >
        {pending ? "Starting docking…" : groups.length > 1 ? "Dock with these structures" : firstPick ? `Dock with ${firstPick}` : "Dock"}
      </Button>
    </Box>
  );
};

export default PdbPicker;
