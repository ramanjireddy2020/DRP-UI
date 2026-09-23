import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  Box,
  Typography,
  IconButton,
  Button,
} from "@mui/material";

import { BG_IMAGE } from "../WelcomeScreen";

import { AddOutlined } from "@mui/icons-material";

import NewProjectModal from "../NewProjectModal";
import ComposerAddPopover, { ComposerAttachments } from "../Composer/ComposerAddPopover";
import useComposer from "../../hooks/useComposer";

const FONT = "'Inter', sans-serif";

const TEXT_DARK = "#0F172A";

const NewResearchPage = () => {
  const navigate = useNavigate();

  const inputRef = useRef(null);

  /*
   * Query, module, project and attached files, plus draft autosave
   * (POST/PATCH /sessions/draft) — shared with the HomePage composer.
   */
  const composer = useComposer();
  const { query, setQuery } = composer;

  const [addAnchorEl, setAddAnchorEl] = useState(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  /* ---------------------------------------------------------------------- */
  /* Submit research                                                        */
  /* ---------------------------------------------------------------------- */

  const handleSubmit = () => {
    if (!query.trim() || composer.uploading) return;

    // Contract: { query, module, projectId, fileIds }.
    navigate("/dashboard/new-research/workflow", {
      state: composer.buildWorkflowState(),
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

                flex: 1,

                minWidth: 0,

                height: "26px",
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

              <ComposerAttachments composer={composer} />
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
                disabled={!query.trim() || composer.uploading}
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

      <ComposerAddPopover
        anchorEl={addAnchorEl}
        onClose={() => setAddAnchorEl(null)}
        composer={composer}
        onCreateProject={() => setCreateModalOpen(true)}
      />

      {/* ================================================================== */}
      {/* NEW PROJECT MODAL                                                  */}
      {/* ================================================================== */}

      <NewProjectModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreated={(project) => {
          composer.selectProject(project);
          composer.reloadProjects();
        }}
      />
    </Box>
  );
};

export default NewResearchPage;