import React, { useEffect, useMemo, useState } from "react";
import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  Radio, TextField, Typography,
} from "@mui/material";
import { FONT, TEAL, BORDER, TEXT_DARK, TEXT_MUTED } from "../workflowConstants";

/**
 * "Continue to NovSearch" from ScreenSuite (review 2026-10-08, S4).
 *
 * ScreenSuite had no way forward: the only route to a patent analysis was
 * typing "@NovSearch …" in the chat, and on a branch the supervisor could
 * answer that itself instead of running NovSearch. The researcher picks one
 * docked protein–drug combination (best binding first), or types a query.
 */
const NovSearchHandoffDialog = ({
  open,
  /** [{ id, protein, drug, score, rawScore }] from the docking results. */
  combinations = [],
  disease = null,
  pending = false,
  onCancel,
  /** ({ combination }) or ({ query }) */
  onConfirm,
}) => {
  // Most negative affinity (strongest binding) first.
  const options = useMemo(
    () =>
      [...combinations]
        .filter((c) => c?.protein && c?.drug)
        .sort((a, b) => (a.rawScore ?? Infinity) - (b.rawScore ?? Infinity)),
    [combinations]
  );

  const [picked, setPicked] = useState(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) return;
    setPicked(options[0]?.id ?? null);
    setQuery("");
  }, [open, options]);

  const typed = query.trim();
  const combination = options.find((o) => o.id === picked) ?? null;
  // A typed query takes precedence over the list selection.
  const canContinue = !pending && (typed.length > 0 || Boolean(combination));

  const confirm = () => {
    if (!canContinue) return;
    onConfirm?.(typed ? { query: typed } : { combination });
  };

  return (
    <Dialog open={open} onClose={pending ? undefined : onCancel} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontFamily: FONT, fontSize: "18px", fontWeight: 700, color: TEXT_DARK, pb: "4px" }}>
        Continue to NovSearch
      </DialogTitle>
      <DialogContent>
        <Typography sx={{ fontFamily: FONT, fontSize: "13px", color: TEXT_MUTED, mb: "12px", lineHeight: 1.5 }}>
          Choose a docked protein–drug combination for the patent and novelty analysis
          {disease ? ` in ${disease}` : ""}, or type your own query.
        </Typography>

        {options.length > 0 && (
          <Box
            role="radiogroup"
            aria-label="Protein–drug combinations"
            sx={{ maxHeight: 280, overflowY: "auto", border: `1px solid ${BORDER}`, borderRadius: "8px", mb: "16px" }}
          >
            {options.map((o) => {
              const selected = !typed && picked === o.id;
              return (
                <Box
                  key={o.id}
                  onClick={() => {
                    setPicked(o.id);
                    setQuery("");
                  }}
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
                  <Radio
                    size="small"
                    checked={selected}
                    value={o.id}
                    inputProps={{ "aria-label": `${o.protein} and ${o.drug}` }}
                    sx={{ color: TEXT_MUTED, "&.Mui-checked": { color: TEAL } }}
                  />
                  <Typography sx={{ flex: 1, fontFamily: FONT, fontSize: "13px", fontWeight: 600, color: TEXT_DARK }}>
                    {o.protein} ×{" "}
                    <Box component="span" sx={{ textTransform: "capitalize" }}>{String(o.drug).toLowerCase()}</Box>
                  </Typography>
                  {o.score != null && o.score !== "—" && (
                    <Typography sx={{ fontFamily: FONT, fontSize: "12px", color: TEXT_MUTED }}>{o.score} kcal/mol</Typography>
                  )}
                </Box>
              );
            })}
          </Box>
        )}

        <TextField
          fullWidth
          size="small"
          multiline
          minRows={2}
          label={options.length ? "Or type a query" : "Query"}
          placeholder="e.g. novelty of the combination JAK2 and ruxolitinib in thrombocytosis"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              confirm();
            }
          }}
          inputProps={{ style: { fontFamily: FONT, fontSize: "13px" } }}
        />
      </DialogContent>
      <DialogActions sx={{ px: "24px", pb: "16px" }}>
        <Button onClick={onCancel} disabled={pending} sx={{ textTransform: "none", fontFamily: FONT, color: TEXT_DARK }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          disableElevation
          disabled={!canContinue}
          onClick={confirm}
          sx={{ textTransform: "none", fontFamily: FONT, fontWeight: 600, bgcolor: TEAL, "&:hover": { bgcolor: "#00A9BF" } }}
        >
          {pending ? "Starting…" : "Run NovSearch"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default NovSearchHandoffDialog;
