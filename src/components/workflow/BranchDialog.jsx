import React, { useEffect, useState } from "react";
import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, TextField, Typography,
} from "@mui/material";
import { FONT, TEAL, BORDER, TEXT_DARK, TEXT_MUTED } from "./workflowConstants";
import { moduleDisplayFor } from "../../workflow/moduleMap";

/**
 * Create a branch from a step: Branch Research → Branch Created → Go to Branch.
 *
 * Testing asked for branching like a git branch — diverge from main to try
 * something different (e.g. CurateX for STAT3 while main stays on JAK2) — and
 * found the Branch button just re-ran the step. This is the flow from the
 * original UX screens, now wired: the branch is a real step posted with
 * `fromStepId`, optionally with a different target.
 */

/** Modules whose hand-off carries a target the branch can change. */
const TARGET_MODULES = new Set(["litminex", "curatex", "screensuite", "novsearch"]);

const BranchDialog = ({
  /** { moduleKey, stepId, selections } of the step being branched, or null. */
  source,
  /** The branch that was just created, to show the success state. */
  created = null,
  pending = false,
  error = null,
  onCreate,
  onGoToBranch,
  onClose,
}) => {
  const display = source ? moduleDisplayFor(source.moduleKey) : null;
  const currentTarget =
    source?.selections?.targetIds?.[0] ?? source?.selections?.target ?? "";

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [target, setTarget] = useState("");

  useEffect(() => {
    if (!source) return;
    setName("");
    setDescription("");
    setTarget(currentTarget);
  }, [source, currentTarget]);

  const canChangeTarget = source && TARGET_MODULES.has(source.moduleKey);
  const trimmedTarget = target.trim();

  return (
    <Dialog open={Boolean(source)} onClose={pending ? undefined : onClose} fullWidth maxWidth="sm">
      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", p: "20px 24px 0" }}>
        <Box>
          <DialogTitle sx={{ p: 0, fontFamily: FONT, fontSize: "18px", fontWeight: 700, color: TEXT_DARK }}>
            {created ? "Branch Created" : "Branch Research"}
          </DialogTitle>
          <Typography sx={{ fontFamily: FONT, fontSize: "13px", color: TEXT_MUTED, mt: "2px" }}>
            {created
              ? "Your new branch has been created successfully."
              : `Create a new branch from the current ${display?.label || ""} results. Main stays as it is.`}
          </Typography>
        </Box>
        <IconButton onClick={onClose} disabled={pending} aria-label="Close" sx={{ color: TEXT_MUTED }}>
          ×
        </IconButton>
      </Box>

      <DialogContent sx={{ pt: "16px" }}>
        {created ? (
          <Box sx={{ display: "flex", flexDirection: "column", gap: "6px", p: "14px 16px", border: `1px solid ${BORDER}`, borderRadius: "8px", bgcolor: "#F0FDFC" }}>
            <Typography sx={{ fontFamily: FONT, fontSize: "15px", fontWeight: 600, color: TEXT_DARK }}>
              {created.name}
            </Typography>
            {created.description && (
              <Typography sx={{ fontFamily: FONT, fontSize: "13px", color: TEXT_MUTED }}>{created.description}</Typography>
            )}
            <Typography sx={{ fontFamily: FONT, fontSize: "12px", color: TEXT_MUTED }}>
              {display?.label}
              {created.target ? ` · ${created.target}` : ""} · running from the selected step
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <TextField
              label="Branch name"
              placeholder={canChangeTarget ? "e.g. STAT3 alternative" : "e.g. Alternative approach"}
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
              size="small"
              autoFocus
            />
            <TextField
              label="Description"
              placeholder="What this branch explores"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              fullWidth
              multiline
              rows={3}
              size="small"
            />
            {canChangeTarget && (
              <TextField
                label="Target (gene symbol)"
                helperText={currentTarget ? `Main uses ${currentTarget}. Change it to explore another target.` : "Optional."}
                value={target}
                onChange={(e) => setTarget(e.target.value.replace(/\s+/g, ""))}
                fullWidth
                size="small"
              />
            )}
            {error && (
              <Typography role="alert" sx={{ fontFamily: FONT, fontSize: "12px", color: "#DC2626" }}>
                {error}
              </Typography>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: "24px", pb: "18px" }}>
        <Button onClick={onClose} disabled={pending} sx={{ textTransform: "none", fontFamily: FONT, color: TEXT_DARK, border: `1px solid ${BORDER}`, borderRadius: "8px", px: "16px" }}>
          {created ? "Close" : "Cancel"}
        </Button>
        <Button
          variant="contained"
          disableElevation
          disabled={pending || (!created && !name.trim())}
          onClick={() =>
            created
              ? onGoToBranch(created)
              : onCreate({ name: name.trim(), description: description.trim(), target: canChangeTarget ? trimmedTarget : "" })
          }
          sx={{ textTransform: "none", fontFamily: FONT, fontWeight: 600, bgcolor: TEAL, borderRadius: "8px", px: "16px", "&:hover": { bgcolor: "#00A9BF" } }}
        >
          {created ? "Go to Branch" : pending ? "Creating…" : "Create & Branch"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BranchDialog;
