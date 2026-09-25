import React, { useState } from "react";
import { Box, Button, Radio, Typography } from "@mui/material";
import { FONT, TEAL, BORDER, TEXT_DARK, TEXT_MUTED } from "../workflowConstants";
import { rcsbUrl } from "../../../workflow/pdbShortlist";

/**
 * "Pick a structure to dock against" — the ScreenSuite PDB shortlist as a
 * choice rather than an error. Choosing one continues docking with it.
 */
const PdbPicker = ({ target, options, onPick, pending = false, message = null }) => {
  const [picked, setPicked] = useState(options[0]?.id ?? null);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "12px", p: "16px", border: `1px solid ${BORDER}`, borderRadius: "10px", bgcolor: "#FFFFFF" }}>
      <Typography sx={{ fontFamily: FONT, fontSize: "15px", fontWeight: 600, color: TEXT_DARK }}>
        Choose a protein structure{target ? ` for ${target}` : ""}
      </Typography>
      <Typography sx={{ fontFamily: FONT, fontSize: "13px", color: TEXT_MUTED, lineHeight: 1.5 }}>
        {message ||
          "More than one PDB structure matches this target. Pick the one to dock against."}
      </Typography>

      <Box role="radiogroup" aria-label="PDB structures" sx={{ border: `1px solid ${BORDER}`, borderRadius: "8px", overflow: "hidden" }}>
        {options.map((o) => (
          <Box
            key={o.id}
            onClick={() => setPicked(o.id)}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              p: "6px 12px 6px 4px",
              cursor: "pointer",
              borderBottom: `1px solid ${BORDER}`,
              "&:last-of-type": { borderBottom: "none" },
              bgcolor: picked === o.id ? "rgba(0,188,212,0.08)" : "transparent",
            }}
          >
            <Radio size="small" checked={picked === o.id} value={o.id} inputProps={{ "aria-label": o.id }} sx={{ "&.Mui-checked": { color: TEAL } }} />
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
        ))}
      </Box>

      <Button
        variant="contained"
        disableElevation
        disabled={!picked || pending}
        onClick={() => onPick(picked)}
        sx={{ alignSelf: "flex-start", textTransform: "none", fontFamily: FONT, fontWeight: 600, bgcolor: TEAL, "&:hover": { bgcolor: "#089B98" } }}
      >
        {pending ? "Starting docking…" : picked ? `Dock with ${picked}` : "Dock"}
      </Button>
    </Box>
  );
};

export default PdbPicker;
