import React, { useEffect, useMemo, useState } from "react";
import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  Radio, TextField, Typography,
} from "@mui/material";
import { geneNameForTarget } from "../../workflow/selections";
import { FONT, TEAL, BORDER, TEXT_DARK, TEXT_MUTED } from "./workflowConstants";

/**
 * Asks which protein target CurateX should build an ideal candidate profile for.
 *
 * Testing found "Continue to CurateX" never asked: it forwarded whatever the
 * LitMineX step carried, and when LitMineX had been started on the disease
 * that was "thrombocytosis". CurateX looks the target up in UniProt, so it
 * failed with "No reviewed human UniProt entry". The researcher now picks one
 * protein target from the TxKG results (or types a gene symbol) before the
 * hand-off, and the disease name is refused.
 */

/** Gene symbols are short and single-token: JAK2, CALR, MPL. */
const isGeneSymbol = (value) => /^[A-Za-z0-9][A-Za-z0-9-]{0,14}$/.test(value);

const sameText = (a, b) =>
  String(a ?? "").trim().toLowerCase() === String(b ?? "").trim().toLowerCase();

const ProteinTargetPickerDialog = ({
  open,
  /** Normalised TxKG target rows. */
  targets = [],
  /** Pre-selected gene symbol, if a valid one is already known. */
  initialSymbol = null,
  /** The disease under study; never accepted as a target. */
  disease = null,
  pending = false,
  onCancel,
  onConfirm,
}) => {
  // One row per gene symbol; rows without a symbol can't be sent to CurateX.
  const options = useMemo(() => {
    const bySymbol = new Map();
    targets.forEach((t) => {
      const symbol = geneNameForTarget(t);
      if (symbol && !sameText(symbol, disease) && !bySymbol.has(symbol)) {
        bySymbol.set(symbol, { symbol, fullName: t.fullName, score: t.score });
      }
    });
    return [...bySymbol.values()];
  }, [targets, disease]);

  const [picked, setPicked] = useState(null);
  const [typed, setTyped] = useState("");

  // Reset each time the dialog opens, starting from the known target if any.
  useEffect(() => {
    if (!open) return;
    const initialInList = options.some((o) => o.symbol === initialSymbol);
    setPicked(initialInList ? initialSymbol : options[0]?.symbol ?? null);
    setTyped(!initialInList && initialSymbol ? initialSymbol : "");
  }, [open, options, initialSymbol]);

  const typedTrimmed = typed.trim();
  const typedError = !typedTrimmed
    ? null
    : sameText(typedTrimmed, disease)
    ? "That is the disease. Enter a protein target's gene symbol, e.g. JAK2."
    : !isGeneSymbol(typedTrimmed)
    ? "Enter a gene symbol (letters and numbers, no spaces), e.g. JAK2."
    : null;

  // A typed symbol takes precedence over the list selection.
  const choice = typedTrimmed ? (typedError ? null : typedTrimmed.toUpperCase()) : picked;

  return (
    <Dialog open={open} onClose={pending ? undefined : onCancel} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontFamily: FONT, fontSize: "18px", fontWeight: 700, color: TEXT_DARK, pb: "4px" }}>
        Select a protein target
      </DialogTitle>
      <DialogContent>
        <Typography sx={{ fontFamily: FONT, fontSize: "13px", color: TEXT_MUTED, mb: "12px", lineHeight: 1.5 }}>
          CurateX builds an ideal candidate profile for one protein target
          {disease ? `, not the disease (${disease})` : ""}. Choose the target to continue with.
        </Typography>

        {options.length > 0 && (
          <Box
            role="radiogroup"
            aria-label="Protein targets"
            sx={{ maxHeight: 280, overflowY: "auto", border: `1px solid ${BORDER}`, borderRadius: "8px", mb: "16px" }}
          >
            {options.map((o) => {
              const selected = !typedTrimmed && picked === o.symbol;
              return (
                <Box
                  key={o.symbol}
                  onClick={() => {
                    setPicked(o.symbol);
                    setTyped("");
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
                    value={o.symbol}
                    inputProps={{ "aria-label": o.symbol }}
                    sx={{ color: TEXT_MUTED, "&.Mui-checked": { color: TEAL } }}
                  />
                  <Typography sx={{ fontFamily: FONT, fontSize: "13px", fontWeight: 600, color: TEXT_DARK, minWidth: 60 }}>
                    {o.symbol}
                  </Typography>
                  <Typography
                    sx={{ flex: 1, fontFamily: FONT, fontSize: "12px", color: TEXT_MUTED, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                  >
                    {o.fullName}
                  </Typography>
                  {o.score != null && (
                    <Typography sx={{ fontFamily: FONT, fontSize: "12px", fontWeight: 600, color: "#059669" }}>{o.score}</Typography>
                  )}
                </Box>
              );
            })}
          </Box>
        )}

        <TextField
          fullWidth
          size="small"
          label={options.length ? "Or enter a gene symbol" : "Gene symbol"}
          placeholder="e.g. JAK2"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          error={Boolean(typedError)}
          helperText={
            typedError ||
            (options.length ? " " : "No TxKG targets are available in this session, so enter one.")
          }
          inputProps={{ style: { fontFamily: FONT } }}
        />
      </DialogContent>
      <DialogActions sx={{ px: "24px", pb: "16px" }}>
        <Button onClick={onCancel} disabled={pending} sx={{ textTransform: "none", fontFamily: FONT, color: TEXT_MUTED }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          disableElevation
          disabled={!choice || pending}
          onClick={() => onConfirm(choice)}
          sx={{ textTransform: "none", fontFamily: FONT, fontWeight: 600, bgcolor: TEAL, "&:hover": { bgcolor: "#089B98" } }}
        >
          {choice ? `Continue with ${choice}` : "Continue"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProteinTargetPickerDialog;
