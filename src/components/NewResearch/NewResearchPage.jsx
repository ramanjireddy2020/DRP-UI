import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  Box,
  Typography,
  TextField,
  IconButton,
  Popover,
  Button,
} from "@mui/material";

import { BG_IMAGE } from "../WelcomeScreen";

import {
  AddOutlined,
  SearchOutlined,
  UploadFileOutlined,
  FolderOpenOutlined,
  ChevronRightOutlined,
} from "@mui/icons-material";

import NewProjectModal from "../NewProjectModal";

const FONT = "'Inter', sans-serif";

const TEAL = "#0ABFBC";
const MUTED = "#94A3B8";
const BORDER = "#E2E8F0";
const TEXT_DARK = "#0F172A";
const BG = "#F8FAFC";

const MOCK_PROJECTS = [
  {
    name: "End to End Virtual Screening",
    dot: "#F97316",
  },
  {
    name: "JAK2 – Thrombocytosis",
    dot: TEAL,
  },
  {
    name: "BRAF Melanoma Research",
    dot: "#16A34A",
  },
  {
    name: "HER2 Breast Cancer Study",
    dot: "#D97706",
  },
  {
    name: "Type 2 Diabetes – PPARG",
    dot: TEAL,
  },
];

const NewResearchPage = () => {
  const navigate = useNavigate();

  const inputRef = useRef(null);

  const [query, setQuery] = useState("");
  const [addAnchorEl, setAddAnchorEl] = useState(null);
  const [showProjectSub, setShowProjectSub] = useState(false);
  const [projectSearch, setProjectSearch] = useState("");
  const [selectedProject, setSelectedProject] = useState(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  /* ---------------------------------------------------------------------- */
  /* Submit research                                                        */
  /* ---------------------------------------------------------------------- */

  const handleSubmit = () => {
    if (!query.trim()) return;

    navigate("/dashboard/new-research/workflow", {
      state: {
        query: query.trim(),
      },
    });
  };

  /* ---------------------------------------------------------------------- */
  /* Keyboard handling                                                      */
  /* ---------------------------------------------------------------------- */

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  /* ---------------------------------------------------------------------- */
  /* Close popover                                                          */
  /* ---------------------------------------------------------------------- */

  const closeAddPopover = () => {
    setAddAnchorEl(null);
    setShowProjectSub(false);
    setProjectSearch("");
  };

  /* ---------------------------------------------------------------------- */
  /* Add / Project popover                                                  */
  /* ---------------------------------------------------------------------- */

  const renderAddPopover = () => {
    const filteredProjects = MOCK_PROJECTS.filter((project) =>
      !projectSearch
        ? true
        : project.name
            .toLowerCase()
            .includes(projectSearch.toLowerCase())
    );

    return (
      <Popover
        open={Boolean(addAnchorEl)}
        anchorEl={addAnchorEl}
        onClose={closeAddPopover}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
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
        <Box
          sx={{
            display: "flex",
            maxWidth: "100%",
          }}
        >
          {/* ============================================================ */}
          {/* MAIN MENU                                                     */}
          {/* ============================================================ */}

          <Box
            sx={{
              width: "220px",
              py: "6px",
              flexShrink: 0,
            }}
          >
            {/* Upload files */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                px: "14px",
                py: "10px",
                cursor: "pointer",

                "&:hover": {
                  bgcolor: BG,
                },
              }}
            >
              <UploadFileOutlined
                sx={{
                  fontSize: 16,
                  color: MUTED,
                  flexShrink: 0,
                }}
              />

              <Typography
                sx={{
                  fontFamily: FONT,
                  fontSize: "13px",
                  fontWeight: 500,
                  color: TEXT_DARK,
                }}
              >
                Upload files or data
              </Typography>
            </Box>

            {/* Add to project */}
            <Box
              onClick={() => setShowProjectSub((previous) => !previous)}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "10px",
                px: "14px",
                py: "10px",
                cursor: "pointer",

                bgcolor: showProjectSub ? BG : "transparent",

                "&:hover": {
                  bgcolor: BG,
                },
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <FolderOpenOutlined
                  sx={{
                    fontSize: 16,
                    color: MUTED,
                    flexShrink: 0,
                  }}
                />

                <Typography
                  sx={{
                    fontFamily: FONT,
                    fontSize: "13px",
                    fontWeight: 500,
                    color: TEXT_DARK,
                  }}
                >
                  Add to project
                </Typography>
              </Box>

              <ChevronRightOutlined
                sx={{
                  fontSize: 15,
                  color: MUTED,
                }}
              />
            </Box>
          </Box>

          {/* ============================================================ */}
          {/* PROJECT SUBMENU                                                */}
          {/* ============================================================ */}

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

              {/* Project search */}
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
                <SearchOutlined
                  sx={{
                    fontSize: 13,
                    color: MUTED,
                    flexShrink: 0,
                  }}
                />

                <TextField
                  variant="standard"
                  placeholder="Search projects..."
                  value={projectSearch}
                  onChange={(e) => setProjectSearch(e.target.value)}
                  fullWidth
                  InputProps={{
                    disableUnderline: true,
                  }}
                  sx={{
                    "& input": {
                      fontFamily: FONT,
                      fontSize: "12px",
                      color: TEXT_DARK,
                      py: 0,
                    },

                    "& input::placeholder": {
                      color: MUTED,
                      opacity: 1,
                    },
                  }}
                />
              </Box>

              {/* Project list */}
              <Box
                sx={{
                  flex: 1,
                  overflowY: "auto",
                  minHeight: 0,
                }}
              >
                {filteredProjects.length > 0 ? (
                  filteredProjects.map((project) => (
                    <Box
                      key={project.name}
                      onClick={() => {
                        setSelectedProject(project);
                        setAddAnchorEl(null);
                        setShowProjectSub(false);
                        setProjectSearch("");
                      }}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        px: "14px",
                        py: "8px",
                        cursor: "pointer",

                        bgcolor:
                          selectedProject?.name === project.name
                            ? "#E6FAFA"
                            : "transparent",

                        "&:hover": {
                          bgcolor: "#E6FAFA",
                        },
                      }}
                    >
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          bgcolor: project.dot,
                          flexShrink: 0,
                        }}
                      />

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
                  ))
                ) : (
                  <Box
                    sx={{
                      px: "14px",
                      py: "12px",
                    }}
                  >
                    <Typography
                      sx={{
                        fontFamily: FONT,
                        fontSize: "12px",
                        color: MUTED,
                      }}
                    >
                      No projects found
                    </Typography>
                  </Box>
                )}
              </Box>

              {/* Create project */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  px: "14px",
                  py: "8px",
                  mt: "2px",
                  borderTop: `1px solid ${BORDER}`,
                  cursor: "pointer",

                  "&:hover": {
                    bgcolor: BG,
                  },
                }}
                onClick={() => {
                  setAddAnchorEl(null);
                  setShowProjectSub(false);
                  setCreateModalOpen(true);
                }}
              >
                <Typography
                  sx={{
                    fontFamily: FONT,
                    fontSize: "12.5px",
                    fontWeight: 600,
                    color: TEAL,
                  }}
                >
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
          md: "48px 32px",
          lg: "56px 40px",
        },

        overflow: "hidden",
        background: "#F8FAFC",
        boxSizing: "border-box",
      }}
    >
      {/* ================================================================== */}
      {/* BACKGROUND                                                         */}
      {/* ================================================================== */}

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

      {/* ================================================================== */}
      {/* MAIN CONTENT                                                       */}
      {/* ================================================================== */}

      <Box
        sx={{
          position: "relative",
          zIndex: 2,

          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",

          gap: {
            xs: "16px",
            sm: "18px",
            md: "20px",
          },

          width: "100%",

          maxWidth: {
            xs: "100%",
            sm: "620px",
            md: "680px",
            lg: "680px",
          },
        }}
      >
        {/* ================================================================= */}
        {/* HERO                                                              */}
        {/* ================================================================= */}

        <Box
          sx={{
            display: "flex",
            flexDirection: "column",

            gap: {
              xs: "14px",
              sm: "16px",
              md: "20px",
            },

            width: "100%",
          }}
        >
          {/* Eyebrow */}
          <Typography
            sx={{
              fontFamily: FONT,
              fontStyle: "normal",
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

          {/* Heading */}
          <Typography
            sx={{
              width: "100%",

              fontFamily: FONT,
              fontStyle: "normal",
              fontWeight: 700,

              fontSize: {
                xs: "28px",
                sm: "32px",
                md: "36px",
                lg: "40px",
              },

              lineHeight: 1.2,

              color: TEXT_DARK,

              letterSpacing: "-0.03em",

              wordBreak: "normal",
              overflowWrap: "break-word",
            }}
          >
            What drug are you going to{" "}
            <Box
              component="span"
              sx={{
                color: "#00CC8C",
              }}
            >
              repurpose today?
            </Box>
          </Typography>

          {/* Description */}
          <Typography
            sx={{
              maxWidth: "500px",
              width: "100%",

              fontFamily: FONT,
              fontStyle: "normal",
              fontWeight: 400,

              fontSize: "14px",

              lineHeight: "26px",

              color: "#667080",
            }}
          >
            Start with a disease name. iNovaPath recommends ranked protein
            targets — you confirm before anything advances.
          </Typography>
        </Box>

        {/* ================================================================= */}
        {/* CHAT INPUT CONTAINER                                              */}
        {/* ================================================================= */}

        <Box
          sx={{
            boxSizing: "border-box",

            width: "100%",

            height: "123px",
            minHeight: "123px",

            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",

            padding: "16px 16px 12px",

            gap: "12px",

            isolation: "isolate",

            alignSelf: "stretch",

            background: "#FFFFFF",

            border: "1px solid #E2E8F0",

            boxShadow:
              "0px 1px 4px rgba(0, 0, 0, 0.0392157), 0px 4px 16px rgba(0, 0, 0, 0.0509804)",

            borderRadius: "14px",

            position: "relative",

            overflow: "hidden",
          }}
        >
          {/* ================================================================ */}
          {/* ACCENT LINE                                                      */}
          {/* ================================================================ */}

          <Box
            sx={{
              position: "absolute",

              width: "100%",
              height: "4px",

              left: 0,
              top: 0,

              background:
                "linear-gradient(90deg, #00A699 0%, #00CC8C 100%)",

              borderRadius: "2px",

              zIndex: 0,

              pointerEvents: "none",
            }}
          />

          {/* ================================================================ */}
          {/* INPUT ROW                                                        */}
          {/* ================================================================ */}

          <Box
            onClick={() => {
              inputRef.current?.focus();
            }}
            sx={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",

              padding: 0,

              gap: "12px",

              width: "100%",
              height: "24px",

              flexShrink: 0,

              zIndex: 1,

              cursor: "text",
            }}
          >
            {/* ============================================================ */}
            {/* NATIVE TEXTAREA                                               */}
            {/* ============================================================ */}

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
                height: "24px",

                minHeight: "24px",
                maxHeight: "24px",

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

                fontStyle: "normal",

                fontWeight: 400,

                fontSize: "15px",

                lineHeight: "24px",

                /*
                 * Actual entered text.
                 */
                color: "#0F172A",

                /*
                 * Explicitly force the cursor to be visible.
                 */
                caretColor: "#0F172A",

                /*
                 * Do NOT use WebkitTextFillColor here.
                 * It was contributing to the caret problem.
                 */

                "&::placeholder": {
                  color: "#99A3AD",

                  opacity: 1,
                },

                "&:focus": {
                  outline: "none",

                  border: 0,

                  boxShadow: "none",

                  caretColor: "#0F172A",
                },

                "&:focus-visible": {
                  outline: "none",
                },

                "&::selection": {
                  background: "#BFEFE8",

                  color: "#0F172A",
                },
              }}
            />
          </Box>

          {/* ================================================================ */}
          {/* TOOLBAR                                                          */}
          {/* ================================================================ */}

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
            {/* ============================================================ */}
            {/* TOOLBAR LEFT                                                  */}
            {/* ============================================================ */}

            <Box
              sx={{
                display: "flex",

                flexDirection: "row",

                alignItems: "center",

                padding: 0,

                gap: "8px",

                width: "26px",

                height: "26px",

                flexShrink: 0,
              }}
            >
              <IconButton
                size="small"
                onClick={(e) => setAddAnchorEl(e.currentTarget)}
                aria-label="Add files or project"
                sx={{
                  boxSizing: "border-box",

                  display: "flex",

                  flexDirection: "row",

                  alignItems: "center",

                  justifyContent: "center",

                  padding: "6px",

                  width: "26px",

                  height: "26px",

                  background: "#F8FAFC",

                  border: "1px solid #E2E8F0",

                  borderRadius: "8px",

                  color: "#64748B",

                  flexShrink: 0,

                  "&:hover": {
                    background: "#F1F5F9",

                    borderColor: "#CBD5E1",
                  },
                }}
              >
                <AddOutlined
                  sx={{
                    width: "14px",
                    height: "14px",

                    fontSize: "14px",

                    color: "#64748B",
                  }}
                />
              </IconButton>
            </Box>

            {/* ============================================================ */}
            {/* TOOLBAR RIGHT                                                  */}
            {/* ============================================================ */}

            <Box
              sx={{
                display: "flex",

                flexDirection: "row",

                alignItems: "center",

                padding: 0,

                gap: "10px",

                width: "141px",

                height: "32px",

                flexShrink: 0,
              }}
            >
              <Button
                onClick={handleSubmit}
                disabled={!query.trim()}
                sx={{
                  display: "flex",

                  flexDirection: "row",

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

                  fontStyle: "normal",

                  fontWeight: 500,

                  fontSize: "13px",

                  lineHeight: "16px",

                  textTransform: "none",

                  whiteSpace: "nowrap",

                  boxShadow: "none",

                  opacity: 1,

                  "&:hover": {
                    background: "#1F2938",

                    boxShadow: "none",
                  },

                  "&:disabled": {
                    background: "#1F2938",

                    color: "#FFFFFF",

                    opacity: 1,
                  },

                  "&:focus-visible": {
                    outline: "2px solid #00BFA6",

                    outlineOffset: "2px",
                  },
                }}
              >
                Begin research

                <span
                  aria-hidden="true"
                  style={{
                    fontSize: "16px",
                    lineHeight: "16px",
                  }}
                >
                  →
                </span>
              </Button>
            </Box>
          </Box>

        </Box>
      </Box>

      {/* ================================================================== */}
      {/* ADD POPOVER                                                        */}
      {/* ================================================================== */}

      {renderAddPopover()}

      {/* ================================================================== */}
      {/* NEW PROJECT MODAL                                                  */}
      {/* ================================================================== */}

      <NewProjectModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />
    </Box>
  );
};

export default NewResearchPage;