import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog, DialogContent, Box, Typography, TextField, Button, IconButton,
} from "@mui/material";
import { CloseOutlined, ScienceOutlined, CheckCircleOutlined } from "@mui/icons-material";
import { createProject } from "../services/api/projects";

const TEAL = "#0ABFBC";
const DARK = "#0F172A";
const SUB  = "#64748B";
const FONT = "'Inter', sans-serif";

const fieldSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "8px", fontFamily: FONT, fontSize: "13px",
    "& fieldset": { borderColor: "#E2E8F0" },
    "&:hover fieldset": { borderColor: "#CBD5E1" },
    "&.Mui-focused fieldset": { borderColor: TEAL, borderWidth: "1.5px" },
  },
  "& input::placeholder": { color: "#94A3B8", opacity: 1, fontFamily: FONT },
};

/**
 * Creates a project via POST /projects. The contract body is exactly
 * { name, disease, module, status } — there is no description field, so the
 * form doesn't ask for one. onCreated(project) receives the API response.
 */
const NewProjectModal = ({ open, onClose, onCreated }) => {
  const navigate = useNavigate();
  const [name, setName]       = useState("");
  const [disease, setDisease] = useState("");
  const [step, setStep]       = useState("form");
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState(null);
  const [created, setCreated] = useState(null);

  const handleCreate = async () => {
    setSaving(true);
    setError(null);
    try {
      const project = await createProject({
        name: name.trim(),
        disease: disease.trim(),
        module: "TxKG",
        status: "Active",
      });
      setCreated(project);
      setStep("success");
      onCreated?.(project);
    } catch (err) {
      setError(err.userMessage || err.message || "Failed to create project");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (saving) return;
    setName("");
    setDisease("");
    setError(null);
    setCreated(null);
    setStep("form");
    onClose();
  };

  const handleViewProject = () => {
    const id = created?.id;
    handleClose();
    navigate(id ? `/dashboard/active-projects/${id}` : "/dashboard/active-projects");
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      PaperProps={{
        sx: {
          borderRadius: "16px",
          width: "480px",
          maxWidth: "480px",
          p: 0,
          boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
        },
      }}
    >
      {step === "form" ? (
        <>
          <Box sx={{
            display: "flex", alignItems: "flex-start", justifyContent: "space-between",
            px: "28px", pt: "28px", pb: "20px",
          }}>
            <Box sx={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
              <Box sx={{
                width: 40, height: 40, borderRadius: "10px", bgcolor: "#E6FAFA",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <ScienceOutlined sx={{ fontSize: 22, color: TEAL }} />
              </Box>
              <Box>
                <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: "18px", color: DARK, lineHeight: 1.3 }}>
                  New project
                </Typography>
                <Typography sx={{ fontFamily: FONT, fontSize: "13px", color: SUB, mt: "2px" }}>
                  Create a new project
                </Typography>
              </Box>
            </Box>
            <IconButton onClick={handleClose} size="small" sx={{ color: "#94A3B8", mt: "-4px", mr: "-4px" }}>
              <CloseOutlined sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>

          <Box sx={{ height: "1px", bgcolor: "#E2E8F0" }} />

          <DialogContent sx={{ px: "28px", pt: "24px", pb: "24px" }}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <Box>
                <Typography sx={{ fontFamily: FONT, fontSize: "13px", fontWeight: 500, color: DARK, mb: "8px" }}>
                  Project Name
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="e.g. Thrombocytosis repurposing"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  sx={fieldSx}
                />
              </Box>
              <Box>
                <Typography sx={{ fontFamily: FONT, fontSize: "13px", fontWeight: 500, color: DARK, mb: "8px" }}>
                  Disease
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="e.g. Thrombocytosis"
                  value={disease}
                  onChange={(e) => setDisease(e.target.value)}
                  sx={fieldSx}
                />
              </Box>
              {error && (
                <Typography role="alert" sx={{ fontFamily: FONT, fontSize: "12.5px", color: "#DC2626" }}>
                  {error}
                </Typography>
              )}
            </Box>
          </DialogContent>

          <Box sx={{ height: "1px", bgcolor: "#E2E8F0" }} />

          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: "10px", px: "28px", py: "20px" }}>
            <Button
              onClick={handleClose}
              sx={{
                fontFamily: FONT, fontSize: "13px", fontWeight: 500,
                color: DARK, textTransform: "none", borderRadius: "8px", px: "18px",
                "&:hover": { bgcolor: "#F8FAFC" },
              }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              disableElevation
              onClick={handleCreate}
              disabled={!name.trim() || !disease.trim() || saving}
              sx={{
                fontFamily: FONT, fontSize: "13px", fontWeight: 500,
                bgcolor: TEAL, color: "#fff", textTransform: "none",
                borderRadius: "8px", px: "18px",
                "&:hover": { bgcolor: "#09ADAB" },
                "&.Mui-disabled": { bgcolor: "#A5F3F2", color: "#fff" },
              }}
            >
              {saving ? "Creating..." : "Create & Save"}
            </Button>
          </Box>
        </>
      ) : (
        <>
          <Box sx={{
            display: "flex", alignItems: "flex-start", justifyContent: "space-between",
            px: "28px", pt: "28px", pb: "20px",
          }}>
            <Box sx={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
              <Box sx={{
                width: 40, height: 40, borderRadius: "10px", bgcolor: "#E6FAFA",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <ScienceOutlined sx={{ fontSize: 22, color: TEAL }} />
              </Box>
              <Box>
                <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: "18px", color: DARK, lineHeight: 1.3 }}>
                  Project Created
                </Typography>
                <Typography sx={{ fontFamily: FONT, fontSize: "13px", color: SUB, mt: "2px" }}>
                  Success confirmation
                </Typography>
              </Box>
            </Box>
            <IconButton onClick={handleClose} size="small" sx={{ color: "#94A3B8", mt: "-4px", mr: "-4px" }}>
              <CloseOutlined sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>

          <Box sx={{ height: "1px", bgcolor: "#E2E8F0" }} />

          <DialogContent sx={{ px: "28px", pt: "40px", pb: "40px" }}>
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px" }}>
              <Box sx={{
                width: 80, height: 80, borderRadius: "50%",
                bgcolor: TEAL,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <CheckCircleOutlined sx={{ fontSize: 44, color: "#fff" }} />
              </Box>
              <Box sx={{ textAlign: "center" }}>
                <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: "20px", color: DARK, mb: "8px" }}>
                  Project Created Successfully!
                </Typography>
                <Typography sx={{ fontFamily: FONT, fontSize: "13px", color: SUB }}>
                  {created?.name || name || "Your project"} has been added to your active projects.
                </Typography>
              </Box>
              <Button
                variant="contained"
                disableElevation
                onClick={handleViewProject}
                sx={{
                  mt: "4px", fontFamily: FONT, fontSize: "13px", fontWeight: 600,
                  bgcolor: TEAL, color: "#fff", textTransform: "none",
                  borderRadius: "50px", px: "32px", py: "10px",
                  "&:hover": { bgcolor: "#09ADAB" },
                }}
              >
                View Project
              </Button>
            </Box>
          </DialogContent>
        </>
      )}
    </Dialog>
  );
};

export default NewProjectModal;
