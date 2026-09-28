import React, { useEffect, useState } from "react";
import {
  Box, Button, Dialog, IconButton, MenuItem, TextField, Typography,
} from "@mui/material";
import { CallSplit, CheckRounded, CloseRounded } from "@mui/icons-material";
import { FONT, TEAL, BORDER, TEXT_DARK, TEXT_MUTED } from "./workflowConstants";

/**
 * Create a branch from a step: Branch Research → Branch Created → Go to Branch.
 *
 * Built to the UX screens: Branch Name, Branch From (which step of which line
 * to fork from, e.g. "Main (Step 3: TxKG Results)") and Description, then a
 * confirmation with "Branched from …". The branch is a real step posted with
 * `fromStepId` and the branch's name.
 */

const LABEL_SX = { fontFamily: FONT, fontSize: "13px", color: TEXT_MUTED, mb: "6px" };
const INPUT_SX = {
  "& .MuiOutlinedInput-root": { fontFamily: FONT, fontSize: "14px", borderRadius: "8px", color: TEXT_DARK },
  "& .MuiOutlinedInput-notchedOutline": { borderColor: BORDER },
};

const HeaderIcon = () => (
  <Box
    sx={{
      width: 40,
      height: 40,
      borderRadius: "8px",
      bgcolor: TEAL,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    }}
  >
    <CallSplit sx={{ color: "#FFFFFF", fontSize: 20, transform: "rotate(180deg)" }} />
  </Box>
);

const BranchDialog = ({
  /** { moduleKey, stepId, selections } of the step whose Branch was clicked, or null. */
  source,
  /** [{ value: stepId, label: "Main (Step 3: TxKG Results)", moduleKey }] */
  stepOptions = [],
  /** { name, fromLabel } of the branch just created, for the confirmation. */
  created = null,
  pending = false,
  error = null,
  onCreate,
  onGoToBranch,
  onClose,
}) => {
  const [name, setName] = useState("");
  const [fromStepId, setFromStepId] = useState("");
  const [description, setDescription] = useState("");

  // Fresh form each time it opens, forking from the step whose Branch was clicked.
  useEffect(() => {
    if (!source) return;
    setName("");
    setDescription("");
    setFromStepId(source.stepId ?? stepOptions[stepOptions.length - 1]?.value ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);

  const from = stepOptions.find((o) => o.value === fromStepId) ?? null;
  const canCreate = Boolean(name.trim()) && Boolean(fromStepId) && !pending;

  return (
    <Dialog
      open={Boolean(source)}
      onClose={pending ? undefined : onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{ sx: { borderRadius: "12px", overflow: "hidden" } }}
    >
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", gap: "14px", p: "20px 24px", borderBottom: `1px solid ${BORDER}` }}>
        <HeaderIcon />
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontFamily: FONT, fontSize: "17px", fontWeight: 600, color: TEXT_DARK, lineHeight: 1.3 }}>
            {created ? "Branch Created" : "Branch Research"}
          </Typography>
          <Typography sx={{ fontFamily: FONT, fontSize: "13px", color: TEXT_MUTED }}>
            {created ? "Your new branch has been created successfully" : "Create a new branch from current results"}
          </Typography>
        </Box>
        <IconButton onClick={onClose} disabled={pending} aria-label="Close" sx={{ color: TEXT_MUTED }}>
          <CloseRounded />
        </IconButton>
      </Box>

      {/* Body */}
      {created ? (
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", p: "56px 24px 64px", gap: "10px" }}>
          <Box
            sx={{
              width: 60,
              height: 60,
              borderRadius: "50%",
              bgcolor: "rgba(0,188,212,0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mb: "10px",
            }}
          >
            <CheckRounded sx={{ color: TEAL, fontSize: 30 }} />
          </Box>
          <Typography sx={{ fontFamily: FONT, fontSize: "19px", fontWeight: 700, color: TEXT_DARK }}>
            Branch created successfully!
          </Typography>
          <Typography sx={{ fontFamily: FONT, fontSize: "14px", fontWeight: 600, color: TEAL }}>
            {created.name}
          </Typography>
          {created.fromLabel && (
            <Typography sx={{ fontFamily: FONT, fontSize: "13px", color: "#94A3B8" }}>
              Branched from {created.fromLabel}
            </Typography>
          )}
        </Box>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: "18px", p: "24px" }}>
          <Box>
            <Typography sx={LABEL_SX}>Branch Name</Typography>
            <TextField
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. JAK2-alternative-targets"
              fullWidth
              size="small"
              autoFocus
              sx={INPUT_SX}
            />
          </Box>

          <Box>
            <Typography sx={LABEL_SX}>Branch From</Typography>
            <TextField
              select
              value={fromStepId}
              onChange={(e) => setFromStepId(e.target.value)}
              fullWidth
              size="small"
              sx={INPUT_SX}
              SelectProps={{ displayEmpty: true }}
            >
              {stepOptions.length === 0 && (
                <MenuItem value="" disabled sx={{ fontFamily: FONT, fontSize: "14px" }}>
                  No completed step to branch from
                </MenuItem>
              )}
              {stepOptions.map((o) => (
                <MenuItem key={o.value} value={o.value} sx={{ fontFamily: FONT, fontSize: "14px" }}>
                  {o.label}
                </MenuItem>
              ))}
            </TextField>
          </Box>

          <Box>
            <Typography sx={LABEL_SX}>Description</Typography>
            <TextField
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this branch explores"
              fullWidth
              multiline
              rows={4}
              sx={INPUT_SX}
            />
          </Box>

          {error && (
            <Typography role="alert" sx={{ fontFamily: FONT, fontSize: "12px", color: "#DC2626" }}>
              {error}
            </Typography>
          )}
        </Box>
      )}

      {/* Footer */}
      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: "12px", p: "16px 24px", bgcolor: "#F8FAFC", borderTop: `1px solid ${BORDER}` }}>
        <Button
          onClick={onClose}
          disabled={pending}
          sx={{ textTransform: "none", fontFamily: FONT, fontSize: "14px", fontWeight: 500, color: TEXT_DARK, bgcolor: "#FFFFFF", border: `1px solid ${BORDER}`, borderRadius: "8px", px: "18px", "&:hover": { bgcolor: "#F1F5F9" } }}
        >
          {created ? "Close" : "Cancel"}
        </Button>
        <Button
          variant="contained"
          disableElevation
          disabled={created ? false : !canCreate}
          onClick={() =>
            created
              ? onGoToBranch(created)
              : onCreate({
                  name: name.trim(),
                  description: description.trim(),
                  fromStepId,
                  fromModuleKey: from?.moduleKey ?? source?.moduleKey,
                  fromLabel: from?.label ?? null,
                })
          }
          sx={{ textTransform: "none", fontFamily: FONT, fontSize: "14px", fontWeight: 600, bgcolor: TEAL, borderRadius: "8px", px: "18px", "&:hover": { bgcolor: "#00A9BF" } }}
        >
          {created ? "Go to Branch" : pending ? "Creating…" : "Create & Branch"}
        </Button>
      </Box>
    </Dialog>
  );
};

export default BranchDialog;
