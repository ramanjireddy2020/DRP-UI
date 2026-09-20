import React, { useState } from "react";
import {
  Box, Typography, IconButton, Popover, Dialog, TextField, Button,
} from "@mui/material";
import {
  AccountTreeOutlined, IosShareOutlined, CheckOutlined, EditOutlined, CloseOutlined,
} from "@mui/icons-material";
import { useCurrentUser } from "../../context/CurrentUserContext";

// ── Design tokens ────────────────────────────────────────────────────────
const TEAL      = "#0ABFBC";
const BORDER    = "#E2E8F0";
const TEXT_DARK = "#0F172A";
const MUTED     = "#94A3B8";
const BG        = "#F8FAFC";
const FONT      = "'Inter', sans-serif";

const DEFAULT_STEPS = [
  { key: "targets",    label: "Targets"    },
  { key: "literature", label: "Literature" },
  { key: "drugs",      label: "Drugs"      },
  { key: "screen",     label: "Screen"     },
  { key: "novelty",    label: "Novelty"    },
  { key: "docs",       label: "Docs"       },
];

const DEFAULT_BRANCHES = [
  { id: "main", name: "Main", description: "Main research path" },
];

// ── Step progress tracker ───────────────────────────────────────────────
const StepTracker = ({ steps = DEFAULT_STEPS, currentIndex = 0 }) => (
  <Box sx={{ display: "flex", alignItems: "flex-start", width: "100%" }}>
    {steps.map((step, i) => {
      const isDone    = i < currentIndex;
      const isCurrent = i === currentIndex;
      const isFilled  = isDone || isCurrent;
      return (
        <React.Fragment key={step.key}>
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
            <Box sx={{
              width: 28, height: 28, borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              bgcolor: isFilled ? TEAL : "#fff",
              border: `1.5px solid ${isFilled ? TEAL : BORDER}`,
              transition: "all 0.15s",
            }}>
              {isDone ? (
                <CheckOutlined sx={{ fontSize: 14, color: "#fff" }} />
              ) : (
                <Typography sx={{
                  fontFamily: FONT, fontSize: "12px", fontWeight: 700,
                  color: isCurrent ? "#fff" : MUTED,
                }}>
                  {i + 1}
                </Typography>
              )}
            </Box>
            <Typography sx={{
              mt: "8px", fontFamily: FONT, fontSize: "10.5px", fontWeight: 700,
              letterSpacing: "0.5px", textTransform: "uppercase",
              color: isCurrent ? TEAL : MUTED, whiteSpace: "nowrap",
            }}>
              {step.label}
            </Typography>
          </Box>
          {i < steps.length - 1 && (
            <Box sx={{
              flex: 1, height: "1.5px", mt: "14px", mx: "8px",
              bgcolor: i < currentIndex ? TEAL : BORDER,
              transition: "background 0.15s",
            }} />
          )}
        </React.Fragment>
      );
    })}
  </Box>
);

// ── Branch ("Main") dropdown ─────────────────────────────────────────────
const BranchDropdown = ({ branches, activeBranchId, onSelectBranch, onRenameBranch }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState(null);
  const [renameValue, setRenameValue] = useState("");

  const active = branches.find((b) => b.id === activeBranchId) || branches[0];

  const openRename = (branch) => {
    setRenameTarget(branch);
    setRenameValue(branch.name);
    setRenameOpen(true);
    setAnchorEl(null);
  };

  const saveRename = () => {
    if (renameTarget) onRenameBranch(renameTarget.id, renameValue.trim() || renameTarget.name);
    setRenameOpen(false);
  };

  return (
    <>
      <Box
        onClick={(e) => setAnchorEl(e.currentTarget)}
        sx={{
          display: "flex", alignItems: "center", gap: "6px",
          px: "12px", height: "32px", borderRadius: "8px",
          border: `1px solid ${BORDER}`, cursor: "pointer",
          bgcolor: "#fff", "&:hover": { bgcolor: BG },
        }}
      >
        <AccountTreeOutlined sx={{ fontSize: 14, color: TEAL }} />
        <Typography sx={{ fontFamily: FONT, fontSize: "13px", fontWeight: 600, color: TEXT_DARK }}>
          {active.name}
        </Typography>
      </Box>

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        elevation={0}
        PaperProps={{ sx: { mt: "8px", width: "300px", border: `1px solid ${BORDER}`, borderRadius: "10px", boxShadow: "0px 8px 24px rgba(0,0,0,0.1)" } }}
      >
        <Box sx={{ px: "16px", pt: "14px", pb: "10px", borderBottom: `1px solid ${BORDER}` }}>
          <Typography sx={{ fontFamily: FONT, fontSize: "11px", fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.6px" }}>
            Hypothesis branches
          </Typography>
          <Typography sx={{ fontFamily: FONT, fontSize: "12px", color: MUTED, mt: "3px" }}>
            Switch, rename, or delete a research path
          </Typography>
        </Box>
        <Box sx={{ py: "8px" }}>
          {branches.map((b) => (
            <Box
              key={b.id}
              sx={{
                display: "flex", alignItems: "center", gap: "10px",
                px: "16px", py: "8px", cursor: "pointer",
                "&:hover": { bgcolor: BG },
              }}
            >
              <Box
                onClick={() => { onSelectBranch(b.id); setAnchorEl(null); }}
                sx={{
                  width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  bgcolor: b.id === activeBranchId ? TEAL : "#fff",
                  border: `1.5px solid ${b.id === activeBranchId ? TEAL : BORDER}`,
                }}
              >
                {b.id === activeBranchId && <CheckOutlined sx={{ fontSize: 12, color: "#fff" }} />}
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }} onClick={() => { onSelectBranch(b.id); setAnchorEl(null); }}>
                <Typography sx={{ fontFamily: FONT, fontSize: "13px", fontWeight: 600, color: TEXT_DARK }}>{b.name}</Typography>
                <Typography sx={{ fontFamily: FONT, fontSize: "11.5px", color: MUTED }}>{b.description}</Typography>
              </Box>
              <IconButton size="small" onClick={() => openRename(b)} sx={{ color: MUTED, "&:hover": { color: TEXT_DARK } }}>
                <EditOutlined sx={{ fontSize: 15 }} />
              </IconButton>
            </Box>
          ))}
        </Box>
      </Popover>

      {/* Rename branch modal */}
      <Dialog open={renameOpen} onClose={() => setRenameOpen(false)} PaperProps={{ sx: { borderRadius: "14px", width: "440px", maxWidth: "90vw" } }}>
        <Box sx={{ p: "24px" }}>
          <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <Box>
              <Typography sx={{ fontFamily: FONT, fontSize: "11px", fontWeight: 700, color: TEAL, textTransform: "uppercase", letterSpacing: "0.6px", mb: "6px" }}>
                Branch
              </Typography>
              <Typography sx={{ fontFamily: FONT, fontSize: "19px", fontWeight: 700, color: TEXT_DARK }}>
                Rename branch
              </Typography>
            </Box>
            <IconButton size="small" onClick={() => setRenameOpen(false)} sx={{ color: MUTED }}>
              <CloseOutlined sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>
          <Typography sx={{ fontFamily: FONT, fontSize: "13.5px", color: "#475569", lineHeight: 1.6, mt: "10px", mb: "18px" }}>
            Give this hypothesis path a clear name so you can tell it apart from sibling forks.
          </Typography>
          <Typography sx={{ fontFamily: FONT, fontSize: "12.5px", fontWeight: 600, color: TEXT_DARK, mb: "6px" }}>
            Branch name
          </Typography>
          <TextField
            fullWidth value={renameValue} onChange={(e) => setRenameValue(e.target.value)}
            sx={{ mb: "22px", "& .MuiOutlinedInput-root": { borderRadius: "8px", fontFamily: FONT, fontSize: "14px" } }}
          />
          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <Button onClick={() => setRenameOpen(false)} sx={{ fontFamily: FONT, fontSize: "13px", fontWeight: 600, color: TEXT_DARK, textTransform: "none", borderRadius: "8px", px: "16px" }}>
              Cancel
            </Button>
            <Button onClick={saveRename} sx={{ fontFamily: FONT, fontSize: "13px", fontWeight: 600, color: "#fff", bgcolor: TEAL, textTransform: "none", borderRadius: "8px", px: "16px", "&:hover": { bgcolor: "#089B98" } }}>
              Save name
            </Button>
          </Box>
        </Box>
      </Dialog>
    </>
  );
};

// ── Share modal ──────────────────────────────────────────────────────────
const ShareDialog = ({ open, onClose, owner, reviewers = [], onInvite }) => {
  const [email, setEmail] = useState("");
  return (
    <Dialog open={open} onClose={onClose} PaperProps={{ sx: { borderRadius: "14px", width: "460px", maxWidth: "90vw" } }}>
      <Box sx={{ p: "24px" }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <Typography sx={{ fontFamily: FONT, fontSize: "19px", fontWeight: 700, color: TEXT_DARK }}>
            Share research session
          </Typography>
          <IconButton size="small" onClick={onClose} sx={{ color: MUTED }}>
            <CloseOutlined sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
        <Typography sx={{ fontFamily: FONT, fontSize: "13.5px", color: "#475569", lineHeight: 1.6, mt: "10px", mb: "20px" }}>
          Invite another researcher as a reviewer. They can comment and suggest selections; only you (or a collaborator) can Continue.
        </Typography>

        <Typography sx={{ fontFamily: FONT, fontSize: "12.5px", fontWeight: 600, color: TEXT_DARK, mb: "6px" }}>
          Colleague email
        </Typography>
        <Box sx={{ display: "flex", gap: "10px", mb: "18px" }}>
          <TextField
            fullWidth placeholder="colleague@novapath.ai" value={email} onChange={(e) => setEmail(e.target.value)}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px", fontFamily: FONT, fontSize: "14px" } }}
          />
        </Box>
        <Button
          fullWidth
          onClick={() => { if (email.trim()) { onInvite(email.trim()); setEmail(""); } }}
          sx={{ fontFamily: FONT, fontSize: "13px", fontWeight: 700, color: "#fff", bgcolor: "#334155", textTransform: "none", borderRadius: "8px", py: "9px", mb: "20px", "&:hover": { bgcolor: "#1E293B" } }}
        >
          Invite as reviewer
        </Button>

        <Typography sx={{ fontFamily: FONT, fontSize: "11px", fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.6px", pt: "16px", borderTop: `1px solid ${BORDER}`, mb: "12px" }}>
          People
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: "8px" }}>
          <Box>
            <Typography sx={{ fontFamily: FONT, fontSize: "13.5px", fontWeight: 600, color: TEXT_DARK }}>{owner.name}</Typography>
            <Typography sx={{ fontFamily: FONT, fontSize: "12px", color: MUTED }}>{owner.email}</Typography>
          </Box>
          <Box sx={{ px: "10px", py: "3px", borderRadius: "6px", bgcolor: BG, border: `1px solid ${BORDER}` }}>
            <Typography sx={{ fontFamily: FONT, fontSize: "11px", fontWeight: 600, color: "#475569" }}>Owner</Typography>
          </Box>
        </Box>
        <Typography sx={{ fontFamily: FONT, fontSize: "12.5px", color: MUTED }}>
          {reviewers.length === 0
            ? "No reviewers yet. Try colleague@novapath.ai"
            : `${reviewers.length} reviewer${reviewers.length > 1 ? "s" : ""} added.`}
        </Typography>
      </Box>
    </Dialog>
  );
};

// ── Main exported header ─────────────────────────────────────────────────
const ResearchStepHeader = ({
  title = "diabetes",
  stageLabel = "Target identification",
  steps = DEFAULT_STEPS,
  currentIndex = 0,
  branches = DEFAULT_BRANCHES,
  activeBranchId = "main",
  onSelectBranch = () => {},
  onRenameBranch = () => {},
  owner,
  reviewers = [],
  onInvite = () => {},
}) => {
  const [shareOpen, setShareOpen] = useState(false);

  // Review point 6: the owner chip read "DR. Priya" for everyone.
  const currentUser = useCurrentUser();
  const resolvedOwner = owner || {
    name: currentUser.displayName,
    email: currentUser.email || "",
  };

  return (
    <Box sx={{ bgcolor: "#fff" }}>
      {/* Top accent bar */}
      <Box sx={{ height: "4px", background: `linear-gradient(90deg, ${TEAL} 0%, #7C5CFC 100%)` }} />

      <Box sx={{ px: "32px", pt: "20px", pb: "18px", borderBottom: `1px solid ${BORDER}` }}>
        {/* Title row */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: "6px" }}>
          <Typography sx={{ fontFamily: FONT, fontSize: "20px", fontWeight: 700, color: TEXT_DARK }}>
            {title}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <BranchDropdown
              branches={branches}
              activeBranchId={activeBranchId}
              onSelectBranch={onSelectBranch}
              onRenameBranch={onRenameBranch}
            />
            <Box
              onClick={() => setShareOpen(true)}
              sx={{
                display: "flex", alignItems: "center", gap: "6px",
                px: "12px", height: "32px", borderRadius: "8px",
                border: `1px solid ${BORDER}`, cursor: "pointer",
                bgcolor: "#fff", "&:hover": { bgcolor: BG },
              }}
            >
              <IosShareOutlined sx={{ fontSize: 14, color: TEXT_DARK }} />
              <Typography sx={{ fontFamily: FONT, fontSize: "13px", fontWeight: 600, color: TEXT_DARK }}>
                Share
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Breadcrumb */}
        <Typography sx={{ fontFamily: FONT, fontSize: "12.5px", color: MUTED, mb: "18px" }}>
          Step <Box component="span" sx={{ fontWeight: 700, color: "#475569" }}>{currentIndex + 1}</Box> / {steps.length} &nbsp;&middot;&nbsp; {stageLabel}
        </Typography>

        {/* Step tracker */}
        <StepTracker steps={steps} currentIndex={currentIndex} />
      </Box>

      <ShareDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        owner={resolvedOwner}
        reviewers={reviewers}
        onInvite={onInvite}
      />
    </Box>
  );
};

export default ResearchStepHeader;
export { StepTracker };