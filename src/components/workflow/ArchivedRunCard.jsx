import React, { useState } from "react";
import { Box, Typography } from "@mui/material";
import { ExpandMoreOutlined } from "@mui/icons-material";
import { FONT, BORDER, TEXT_DARK, TEXT_MUTED } from "./workflowConstants";
import { moduleDisplayFor } from "../../workflow/moduleMap";

/**
 * An earlier run of a module that has since been run again.
 *
 * Running a module a second time used to replace its card, so the first
 * results disappeared from the thread. The new run now gets its own card below;
 * this keeps what the earlier run found — captured when it was superseded — in
 * its place above, collapsed by default.
 */
const ArchivedRunCard = ({ moduleKey, snapshot }) => {
  const [open, setOpen] = useState(false);
  const display = moduleDisplayFor(moduleKey);

  return (
    <Box sx={{ border: `1px solid ${BORDER}`, borderRadius: "12px", bgcolor: "#FFFFFF", overflow: "hidden" }}>
      <Box
        component="button"
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          width: "100%",
          p: "12px 16px",
          border: "none",
          background: "none",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontFamily: FONT, fontSize: "12px", fontWeight: 700, color: "#1E293B", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            {display?.label || moduleKey} · Earlier run
          </Typography>
          <Typography sx={{ fontFamily: FONT, fontSize: "12px", color: TEXT_MUTED }}>
            {snapshot?.summary || "Superseded by the run below."}
          </Typography>
        </Box>
        <ExpandMoreOutlined sx={{ color: "#94A3B8", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
      </Box>
      {open && (
        <Box sx={{ px: "16px", pb: "14px" }}>
          {snapshot?.items?.length ? (
            <Box component="ol" sx={{ m: 0, pl: "20px", display: "flex", flexDirection: "column", gap: "4px" }}>
              {snapshot.items.map((item, i) => (
                <li key={i}>
                  <Typography component="span" sx={{ fontFamily: FONT, fontSize: "13px", color: TEXT_DARK }}>
                    {item}
                  </Typography>
                </li>
              ))}
            </Box>
          ) : (
            <Typography sx={{ fontFamily: FONT, fontSize: "13px", color: TEXT_MUTED }}>
              This run produced no results to keep.
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
};

export default ArchivedRunCard;
