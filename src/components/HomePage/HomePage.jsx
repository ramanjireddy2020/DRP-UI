import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  IconButton,
  Popover,
  TextField,
} from "@mui/material";
import {
  AddOutlined,
  SearchOutlined,
  UploadFileOutlined,
  FolderOpenOutlined,
  ChevronRightOutlined,
} from "@mui/icons-material";
import { BG_IMAGE } from "../WelcomeScreen";
import NewProjectModal from "../NewProjectModal";

const FONT      = "'Inter', sans-serif";
const TEAL      = "#0ABFBC";
const MUTED     = "#94A3B8";
const BORDER    = "#E2E8F0";
const TEXT_DARK = "#0F172A";
const BG        = "#F8FAFC";

const MOCK_PROJECTS = [
  { name: "End to End Virtual Screening", dot: "#F97316" },
  { name: "JAK2 \u2013 Thrombocytosis",  dot: TEAL      },
  { name: "BRAF Melanoma Research",       dot: "#16A34A" },
  { name: "HER2 Breast Cancer Study",     dot: "#D97706" },
  { name: "Type 2 Diabetes \u2013 PPARG", dot: TEAL     },
];

const RECENT_SESSIONS = [
  { title: "Find protein targets for thrombocytosis", time: "Updated 18h ago"  },
  { title: "find protein targets for TB",             time: "Updated Just now" },
  { title: "high blood pressure",                     time: "Updated 18h ago"  },
  { title: "Psoriasis",                               time: "Updated 1d ago"   },
];

const HomePage = () => {
  const navigate = useNavigate();
  const inputRef = useRef(null);

  const [query,           setQuery]           = useState("");
  const [addAnchorEl,     setAddAnchorEl]     = useState(null);
  const [showProjectSub,  setShowProjectSub]  = useState(false);
  const [projectSearch,   setProjectSearch]   = useState("");
  const [selectedProject, setSelectedProject] = useState(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const handleSubmit = () => {
    if (!query.trim()) return;
    navigate("/dashboard/new-research/workflow", {
      state: { query: query.trim() },
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const closeAddPopover = () => {
    setAddAnchorEl(null);
    setShowProjectSub(false);
    setProjectSearch("");
  };

  const renderAddPopover = () => {
    const filteredProjects = MOCK_PROJECTS.filter((p) =>
      !projectSearch
        ? true
        : p.name.toLowerCase().includes(projectSearch.toLowerCase())
    );

    return (
      <Popover
        open={Boolean(addAnchorEl)}
        anchorEl={addAnchorEl}
        onClose={closeAddPopover}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        elevation={0}
        PaperProps={{
          sx: {
            border: `1px solid ${BORDER}`,
            borderRadius: "10px",
            boxShadow: "0px 8px 24px rgba(0,0,0,0.10)",
            mt: "8px",
            overflow: "hidden",
          },
        }}
      >
        <Box sx={{ display: "flex", maxWidth: "100%" }}>
          <Box sx={{ width: "220px", py: "6px", flexShrink: 0 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                px: "14px",
                py: "10px",
                cursor: "pointer",
                "&:hover": { bgcolor: BG },
              }}
            >
              <UploadFileOutlined sx={{ fontSize: 16, color: MUTED, flexShrink: 0 }} />
              <Typography sx={{ fontFamily: FONT, fontSize: "13px", fontWeight: 500, color: TEXT_DARK }}>
                Upload files or data
              </Typography>
            </Box>

            <Box
              onClick={() => setShowProjectSub((prev) => !prev)}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "10px",
                px: "14px",
                py: "10px",
                cursor: "pointer",
                bgcolor: showProjectSub ? BG : "transparent",
                "&:hover": { bgcolor: BG },
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <FolderOpenOutlined sx={{ fontSize: 16, color: MUTED, flexShrink: 0 }} />
                <Typography sx={{ fontFamily: FONT, fontSize: "13px", fontWeight: 500, color: TEXT_DARK }}>
                  Add to project
                </Typography>
              </Box>
              <ChevronRightOutlined sx={{ fontSize: 15, color: MUTED }} />
            </Box>
          </Box>

          {showProjectSub && (
            <Box
              sx={{
                width: "220px",
                borderLeft: `1px solid ${BORDER}`,
                py: "12px",
                display: "flex",
                flexDirection: "column",
                maxHeight: "320px",
              }}
            >
              <Typography
                sx={{
                  fontFamily: FONT,
                  fontSize: "11px",
                  fontWeight: 700,
                  color: MUTED,
                  textTransform: "uppercase",
                  px: "14px",
                  mb: "8px",
                }}
              >
                Select Project
              </Typography>

              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  mx: "10px",
                  mb: "6px",
                  px: "8px",
                  height: "32px",
                  border: `1px solid ${BORDER}`,
                  borderRadius: "6px",
                  bgcolor: BG,
                }}
              >
                <SearchOutlined sx={{ fontSize: 13, color: MUTED, flexShrink: 0 }} />
                <TextField
                  variant="standard"
                  placeholder="Search projects..."
                  value={projectSearch}
                  onChange={(e) => setProjectSearch(e.target.value)}
                  fullWidth
                  InputProps={{ disableUnderline: true }}
                  sx={{
                    "& input": { fontFamily: FONT, fontSize: "12px", color: TEXT_DARK, py: 0 },
                    "& input::placeholder": { color: MUTED, opacity: 1 },
                  }}
                />
              </Box>

              <Box sx={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
                {filteredProjects.map((project) => (
                  <Box
                    key={project.name}
                    onClick={() => {
                      setSelectedProject(project);
                      closeAddPopover();
                    }}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      px: "14px",
                      py: "8px",
                      cursor: "pointer",
                      bgcolor: selectedProject?.name === project.name ? "#E6FAFA" : "transparent",
                      "&:hover": { bgcolor: "#E6FAFA" },
                    }}
                  >
                    <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: project.dot, flexShrink: 0 }} />
                    <Typography
                      sx={{
                        fontFamily: FONT,
                        fontSize: "12.5px",
                        color: TEXT_DARK,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {project.name}
                    </Typography>
                  </Box>
                ))}
              </Box>

              <Box
                onClick={() => {
                  closeAddPopover();
                  setCreateModalOpen(true);
                }}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  px: "14px",
                  py: "8px",
                  mt: "2px",
                  borderTop: `1px solid ${BORDER}`,
                  cursor: "pointer",
                  "&:hover": { bgcolor: BG },
                }}
              >
                <Typography sx={{ fontFamily: FONT, fontSize: "12.5px", fontWeight: 600, color: TEAL }}>
                  + Create new project
                </Typography>
              </Box>
            </Box>
          )}
        </Box>
      </Popover>
    );
  };

  return (
    <Box
      sx={{
        position: "relative",
        width: "100%",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: {
          xs: "32px 16px",
          sm: "40px 24px",
          md: "80px 40px",
        },
        overflow: "hidden",
        background: "#F8FAFC",
        boxSizing: "border-box",
      }}
    >
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          backgroundImage: `url(${BG_IMAGE})`,
          backgroundSize: "cover",
          backgroundPosition: "left center",
          backgroundRepeat: "no-repeat",
          pointerEvents: "none",
        }}
      />

      {/* perplexity-chat-hero */}
      <Box
        sx={{
          position: "relative",
          zIndex: 2,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: "16px",
          width: "100%",
          maxWidth: {
            xs: "100%",
            sm: "620px",
            md: "680px",
          },
        }}
      >
        {/* HERO */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: "16px", width: "100%" }}>
          {/* ai-label */}
          <Typography
            sx={{
              fontFamily: FONT,
              fontWeight: 600,
              fontSize: "11px",
              lineHeight: "13px",
              letterSpacing: "1.5px",
              color: "#00BCD4",
              textTransform: "uppercase",
            }}
          >
            AI RESEARCH ASSISTANT
          </Typography>

          {/* hero-heading */}
          <Typography
            sx={{
              width: "100%",
              fontFamily: FONT,
              fontWeight: 700,
              fontSize: { xs: "28px", sm: "32px", md: "36px", lg: "40px" },
              lineHeight: 1.2,
              color: "#1A1F26",
              letterSpacing: "-0.03em",
              wordBreak: "normal",
              overflowWrap: "break-word",
            }}
          >
            What drug are you going to{" "}
            <Box component="span" sx={{ color: "#00CC8C" }}>
              repurpose today?
            </Box>
          </Typography>

          {/* description */}
          <Typography
            sx={{
              maxWidth: "500px",
              width: "100%",
              fontFamily: FONT,
              fontWeight: 400,
              fontSize: "14px",
              lineHeight: "17px",
              color: "#667080",
            }}
          >
            Start with a disease name. iNovaPath recommends ranked protein
            targets — you confirm before anything advances.
          </Typography>
        </Box>

        {/* perplexity-style-input-container */}
        <Box
          sx={{
            boxSizing: "border-box",
            width: "100%",
            height: "129px",
            minHeight: "129px",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            padding: "16px",
            gap: "16px",
            isolation: "isolate",
            alignSelf: "stretch",
            background: "#FFFFFF",
            border: "1px solid #E2E8F0",
            boxShadow:
              "0px 1px 4px rgba(0, 0, 0, 0.0392157), 0px 4px 24px rgba(0, 0, 0, 0.0509804)",
            borderRadius: "16px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* accent-line */}
          <Box
            sx={{
              position: "absolute",
              width: "100%",
              height: "4px",
              left: 0,
              top: 0,
              background: "linear-gradient(90deg, #00A699 0%, #00CC8C 100%)",
              borderRadius: "2px",
              zIndex: 0,
              pointerEvents: "none",
            }}
          />

          {/* input-row */}
          <Box
            onClick={() => inputRef.current?.focus()}
            sx={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              padding: 0,
              gap: "12px",
              width: "100%",
              height: "18px",
              flexShrink: 0,
              zIndex: 1,
              cursor: "text",
            }}
          >
            <Box
              component="textarea"
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Find protein targets for..."
              rows={1}
              aria-label="Research query"
              sx={{
                display: "block",
                width: "100%",
                height: "18px",
                minHeight: "18px",
                maxHeight: "18px",
                flex: 1,
                minWidth: 0,
                padding: 0,
                margin: 0,
                border: 0,
                outline: "none",
                background: "transparent",
                resize: "none",
                overflow: "hidden",
                appearance: "none",
                WebkitAppearance: "none",
                fontFamily: FONT,
                fontWeight: 400,
                fontSize: "15px",
                lineHeight: "18px",
                color: "#0F172A",
                caretColor: "#0F172A",
                "&::placeholder": { color: "#99A3AD", opacity: 1 },
                "&:focus": { outline: "none", border: 0, boxShadow: "none" },
                "&:focus-visible": { outline: "none" },
                "&::selection": { background: "#BFEFE8", color: "#0F172A" },
              }}
            />
          </Box>

          {/* toolbar */}
          <Box
            sx={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              padding: 0,
              gap: "12px",
              width: "100%",
              height: "32px",
              flexShrink: 0,
              zIndex: 2,
            }}
          >
            {/* toolbar-left */}
            <Box sx={{ display: "flex", flexDirection: "row", alignItems: "center", padding: 0, gap: "8px", flexShrink: 0 }}>
              <IconButton
                size="small"
                onClick={(e) => setAddAnchorEl(e.currentTarget)}
                aria-label="Add files or project"
                sx={{
                  boxSizing: "border-box",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "6px",
                  width: "26px",
                  height: "26px",
                  background: "#F1F5F9",
                  borderRadius: "8px",
                  color: "#475569",
                  flexShrink: 0,
                  "&:hover": { background: "#E2E8F0" },
                }}
              >
                <AddOutlined sx={{ width: "14px", height: "14px", fontSize: "14px", color: "#475569" }} />
              </IconButton>
            </Box>

            {/* toolbar-right */}
            <Box sx={{ display: "flex", flexDirection: "row", alignItems: "center", padding: 0, gap: "12px", flexShrink: 0 }}>
              <Button
                onClick={handleSubmit}
                disabled={!query.trim()}
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  padding: "8px 16px",
                  gap: "6px",
                  width: "141px",
                  minWidth: "141px",
                  height: "32px",
                  background: "#1F2938",
                  borderRadius: "8px",
                  color: "#FFFFFF",
                  fontFamily: FONT,
                  fontWeight: 500,
                  fontSize: "13px",
                  lineHeight: "16px",
                  textTransform: "none",
                  whiteSpace: "nowrap",
                  boxShadow: "none",
                  opacity: 1,
                  "&:hover": { background: "#1F2938", boxShadow: "none" },
                  "&:disabled": { background: "#1F2938", color: "#FFFFFF", opacity: 1 },
                  "&:focus-visible": { outline: "2px solid #00BFA6", outlineOffset: "2px" },
                }}
              >
                Begin research{" "}
                <span aria-hidden="true" style={{ fontSize: "16px", lineHeight: "16px" }}>
                  →
                </span>
              </Button>
            </Box>
          </Box>

        </Box>

        {/* quick-start — RECENT SESSIONS */}
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            padding: 0,
            gap: "12px",
            width: "100%",
            alignSelf: "stretch",
          }}
        >
          <Typography
            sx={{
              fontFamily: FONT,
              fontWeight: 600,
              fontSize: "11px",
              lineHeight: "13px",
              letterSpacing: "1.2px",
              textTransform: "uppercase",
              color: "#667080",
            }}
          >
            RECENT SESSIONS
          </Typography>

          {/* suggestion-chips 2x2 grid */}
          <Box
            sx={{
              display: "flex",
              flexDirection: "row",
              flexWrap: "wrap",
              alignItems: "flex-start",
              alignContent: "flex-start",
              padding: 0,
              gap: "16px",
              width: "100%",
              alignSelf: "stretch",
            }}
          >
            {RECENT_SESSIONS.map((session, i) => (
              <Box
                key={i}
                onClick={() =>
                  navigate("/dashboard/new-research/workflow", {
                    state: { query: session.title },
                  })
                }
                sx={{
                  boxSizing: "border-box",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  padding: "16px",
                  gap: "6px",
                  width: { xs: "100%", sm: "calc(50% - 8px)" },
                  minHeight: "90px",
                  background: "#FFFFFF",
                  border: "1px solid #EBEDF2",
                  boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.0392157)",
                  borderRadius: "12px",
                  cursor: "pointer",
                  transition: "box-shadow 0.15s, border-color 0.15s",
                  "&:hover": {
                    boxShadow: "0px 4px 16px rgba(0, 0, 0, 0.08)",
                    borderColor: "#D1D5DB",
                  },
                }}
              >
                <Typography
                  sx={{
                    fontFamily: FONT,
                    fontWeight: 600,
                    fontSize: "10px",
                    lineHeight: "12px",
                    letterSpacing: "1px",
                    color: "#00BCD4",
                    textTransform: "uppercase",
                  }}
                >
                  CONTINUE
                </Typography>

                <Typography
                  sx={{
                    fontFamily: FONT,
                    fontWeight: 600,
                    fontSize: "13px",
                    lineHeight: "16px",
                    color: "#1A1F26",
                    maxWidth: "220px",
                  }}
                >
                  {session.title}
                </Typography>

                <Typography
                  sx={{
                    fontFamily: FONT,
                    fontWeight: 400,
                    fontSize: "11px",
                    lineHeight: "13px",
                    color: "#8C99A6",
                  }}
                >
                  {session.time}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      {renderAddPopover()}

      <NewProjectModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />
    </Box>
  );
};

export default HomePage;
