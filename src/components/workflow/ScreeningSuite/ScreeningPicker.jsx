import React, { useEffect, useState } from "react";
import {
  Box, Button, Checkbox, Dialog, IconButton, TextField, Typography,
} from "@mui/material";
import { CloseRounded } from "@mui/icons-material";
import { FONT, TEAL, BORDER, TEXT_DARK, TEXT_MUTED } from "../workflowConstants";

/**
 * Choose what ScreenSuite docks: one or more proteins × one or more compounds.
 *
 * "Continue to ScreenSuite" used to send one target (CurateX's) and either the
 * last compound clicked or CurateX's top five, with no way to choose (testing).
 * Both lists are ticked here, and either can take a free-text entry (a gene
 * symbol or a drug name) for anything not in the list.
 */

const Section = ({ title, hint, options, picked, onToggle, extra, onExtra, extraPlaceholder, onAddExtra }) => (
  <Box sx={{ display: "flex", flexDirection: "column", gap: "6px" }}>
    <Typography sx={{ fontFamily: FONT, fontSize: "13px", fontWeight: 600, color: TEXT_DARK }}>{title}</Typography>
    <Typography sx={{ fontFamily: FONT, fontSize: "12px", color: TEXT_MUTED }}>{hint}</Typography>
    <Box sx={{ maxHeight: 190, overflowY: "auto", border: `1px solid ${BORDER}`, borderRadius: "8px" }}>
      {options.length === 0 && (
        <Typography sx={{ fontFamily: FONT, fontSize: "12px", color: TEXT_MUTED, p: "10px 12px" }}>
          Nothing to pick from yet — add one below.
        </Typography>
      )}
      {options.map((o) => (
        <Box
          key={o.value}
          onClick={() => onToggle(o.value)}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            p: "2px 10px 2px 2px",
            cursor: "pointer",
            borderBottom: `1px solid ${BORDER}`,
            "&:last-of-type": { borderBottom: "none" },
            bgcolor: picked.includes(o.value) ? "rgba(0,188,212,0.07)" : "transparent",
          }}
        >
          <Checkbox size="small" checked={picked.includes(o.value)} sx={{ "&.Mui-checked": { color: TEAL } }} inputProps={{ "aria-label": o.value }} />
          <Typography sx={{ fontFamily: FONT, fontSize: "13px", fontWeight: 600, color: TEXT_DARK }}>{o.value}</Typography>
          {o.detail && (
            <Typography sx={{ flex: 1, fontFamily: FONT, fontSize: "12px", color: TEXT_MUTED, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {o.detail}
            </Typography>
          )}
        </Box>
      ))}
    </Box>
    <Box sx={{ display: "flex", gap: "8px" }}>
      <TextField
        size="small"
        fullWidth
        value={extra}
        placeholder={extraPlaceholder}
        onChange={(e) => onExtra(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onAddExtra();
          }
        }}
        inputProps={{ style: { fontFamily: FONT, fontSize: "13px" } }}
      />
      <Button onClick={onAddExtra} disabled={!extra.trim()} sx={{ textTransform: "none", fontFamily: FONT, color: TEAL }}>
        Add
      </Button>
    </Box>
  </Box>
);

const ScreeningPicker = ({
  open,
  /** [{ value: "JAK2", detail: "Tyrosine-protein kinase JAK2" }] */
  proteinOptions = [],
  /** [{ value: "Ruxolitinib", detail: "score 94.0" }] */
  compoundOptions = [],
  initialProteins = [],
  initialCompounds = [],
  pending = false,
  onCancel,
  onConfirm,
}) => {
  const [proteins, setProteins] = useState([]);
  const [compounds, setCompounds] = useState([]);
  const [extraProteins, setExtraProteins] = useState([]);
  const [extraCompounds, setExtraCompounds] = useState([]);
  const [proteinText, setProteinText] = useState("");
  const [compoundText, setCompoundText] = useState("");

  useEffect(() => {
    if (!open) return;
    setProteins(initialProteins);
    setCompounds(initialCompounds);
    setExtraProteins([]);
    setExtraCompounds([]);
    setProteinText("");
    setCompoundText("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const toggle = (setter) => (value) =>
    setter((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));

  const addExtra = (text, setText, options, setExtras, setPicked, normalise) => () => {
    const value = normalise(text.trim());
    if (!value) return;
    if (!options.some((o) => o.value.toLowerCase() === value.toLowerCase())) {
      setExtras((prev) => (prev.includes(value) ? prev : [...prev, value]));
    }
    setPicked((prev) => (prev.some((v) => v.toLowerCase() === value.toLowerCase()) ? prev : [...prev, value]));
    setText("");
  };

  const allProteins = [...proteinOptions, ...extraProteins.map((v) => ({ value: v, detail: "added" }))];
  const allCompounds = [...compoundOptions, ...extraCompounds.map((v) => ({ value: v, detail: "added" }))];
  const canScreen = proteins.length > 0 && compounds.length > 0 && !pending;

  return (
    <Dialog open={open} onClose={pending ? undefined : onCancel} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: "12px" } }}>
      <Box sx={{ display: "flex", alignItems: "center", p: "18px 24px", borderBottom: `1px solid ${BORDER}` }}>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontFamily: FONT, fontSize: "17px", fontWeight: 600, color: TEXT_DARK }}>Choose what to screen</Typography>
          <Typography sx={{ fontFamily: FONT, fontSize: "13px", color: TEXT_MUTED }}>
            Dock one or more proteins against one or more candidates.
          </Typography>
        </Box>
        <IconButton onClick={onCancel} disabled={pending} aria-label="Close" sx={{ color: TEXT_MUTED }}>
          <CloseRounded />
        </IconButton>
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", gap: "20px", p: "20px 24px" }}>
        <Section
          title="Proteins"
          hint="From the TxKG targets, or add a gene symbol."
          options={allProteins}
          picked={proteins}
          onToggle={toggle(setProteins)}
          extra={proteinText}
          onExtra={setProteinText}
          extraPlaceholder="e.g. STAT3"
          onAddExtra={addExtra(proteinText, setProteinText, allProteins, setExtraProteins, setProteins, (v) => v.replace(/\s+/g, "").toUpperCase())}
        />
        <Section
          title="Candidates"
          hint="From the CurateX results, or add a drug name."
          options={allCompounds}
          picked={compounds}
          onToggle={toggle(setCompounds)}
          extra={compoundText}
          onExtra={setCompoundText}
          extraPlaceholder="e.g. ruxolitinib"
          onAddExtra={addExtra(compoundText, setCompoundText, allCompounds, setExtraCompounds, setCompounds, (v) => v)}
        />
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: "12px", p: "14px 24px", bgcolor: "#F8FAFC", borderTop: `1px solid ${BORDER}` }}>
        <Typography sx={{ flex: 1, fontFamily: FONT, fontSize: "12px", color: TEXT_MUTED }}>
          {proteins.length} protein{proteins.length === 1 ? "" : "s"} × {compounds.length} candidate{compounds.length === 1 ? "" : "s"}
        </Typography>
        <Button onClick={onCancel} disabled={pending} sx={{ textTransform: "none", fontFamily: FONT, color: TEXT_DARK, border: `1px solid ${BORDER}`, borderRadius: "8px", px: "16px", bgcolor: "#FFFFFF" }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          disableElevation
          disabled={!canScreen}
          onClick={() => onConfirm({ proteins, compounds })}
          sx={{ textTransform: "none", fontFamily: FONT, fontWeight: 600, bgcolor: TEAL, borderRadius: "8px", px: "16px", "&:hover": { bgcolor: "#00A9BF" } }}
        >
          {pending ? "Starting…" : "Start screening"}
        </Button>
      </Box>
    </Dialog>
  );
};

export default ScreeningPicker;
