import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  IconButton,
} from "@mui/material";
import { AddOutlined } from "@mui/icons-material";
import { BG_IMAGE } from "../WelcomeScreen";
import NewProjectModal from "../NewProjectModal";
import ComposerAddPopover, { ComposerAttachments } from "../Composer/ComposerAddPopover";
import useComposer from "../../hooks/useComposer";
import { getDashboardSummary, getQuickActions } from "../../services/researchApi";
import { listSessions } from "../../services/api/sessions";
import { formatUtcDateTime } from "../../utils/formatDate";

const FONT      = "'Inter', sans-serif";
const ERROR     = "#DC2626";

const WORKFLOW_ROUTE = "/dashboard/new-research/workflow";
const RECENT_LIMIT = 4;

const STAT_TILES = [
  { key: "activeProjects",    label: "Active projects" },
  { key: "targetsIdentified", label: "Targets identified" },
  { key: "compoundsCurated",  label: "Compounds curated" },
  { key: "patentsAnalysed",   label: "Patents analysed" },
];

const sectionLabelSx = {
  fontFamily: FONT,
  fontWeight: 600,
  fontSize: "11px",
  lineHeight: "13px",
  letterSpacing: "1.2px",
  textTransform: "uppercase",
  color: "#667080",
};

const noteSx = { fontFamily: FONT, fontSize: "12px", color: "#8C99A6" };

/* Counts as the API sent them; "—" when a field is missing. */
const formatCount = (value) =>
  typeof value === "number" && Number.isFinite(value) ? value.toLocaleString("en-US") : "—";

const errText = (err, fallback) => err?.userMessage || err?.message || fallback;

/* Runs one GET on mount and tracks { data, loading, error }. */
const useLoad = (loader) => {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  useEffect(() => {
    let active = true;
    loader()
      .then((data) => active && setState({ data, loading: false, error: null }))
      .catch((err) => active && setState({ data: null, loading: false, error: errText(err, "Failed to load") }));
    return () => {
      active = false;
    };
  }, [loader]);
  return state;
};

const loadRecentSessions = () => listSessions({ page: 1 });

const HomePage = () => {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const composer = useComposer();
  const { query, setQuery, setModule } = composer;

  const [addAnchorEl,     setAddAnchorEl]     = useState(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const summary      = useLoad(getDashboardSummary);
  const quickActions = useLoad(getQuickActions);
  const recent       = useLoad(loadRecentSessions);

  const quickActionItems = Array.isArray(quickActions.data) ? quickActions.data : [];
  const recentItems = (Array.isArray(recent.data?.items) ? recent.data.items : []).slice(0, RECENT_LIMIT);

  const handleSubmit = () => {
    if (!query.trim() || composer.uploading) return;
    navigate(WORKFLOW_ROUTE, { state: composer.buildWorkflowState() });
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const applyQuickAction = (action) => {
    setQuery(action.prefillQuery || action.label || "");
    setModule(action.module || null);
    inputRef.current?.focus();
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
            <Box sx={{ display: "flex", flexDirection: "row", alignItems: "center", padding: 0, gap: "8px", flex: 1, minWidth: 0 }}>
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
              <ComposerAttachments composer={composer} />
            </Box>

            {/* toolbar-right */}
            <Box sx={{ display: "flex", flexDirection: "row", alignItems: "center", padding: 0, gap: "12px", flexShrink: 0 }}>
              <Button
                onClick={handleSubmit}
                disabled={!query.trim() || composer.uploading}
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

        {/* quick-actions — GET /dashboard/quick-actions */}
        {(quickActions.loading || quickActions.error || quickActionItems.length > 0) && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%" }}>
            <Typography sx={sectionLabelSx}>QUICK START</Typography>
            {quickActions.loading && <Typography sx={noteSx}>Loading suggestions...</Typography>}
            {quickActions.error && (
              <Typography sx={{ ...noteSx, color: ERROR }}>
                Couldn&apos;t load suggestions: {quickActions.error}
              </Typography>
            )}
            {quickActionItems.length > 0 && (
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {quickActionItems.map((action, i) => (
                  <Box
                    key={`${action.label}-${i}`}
                    component="button"
                    type="button"
                    onClick={() => applyQuickAction(action)}
                    title={action.prefillQuery}
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      height: "30px",
                      px: "12px",
                      bgcolor: "#FFFFFF",
                      border: "1px solid #EBEDF2",
                      borderRadius: "999px",
                      cursor: "pointer",
                      fontFamily: FONT,
                      fontSize: "12.5px",
                      fontWeight: 500,
                      color: "#1A1F26",
                      boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.0392157)",
                      "&:hover": { borderColor: "#D1D5DB", boxShadow: "0px 4px 16px rgba(0, 0, 0, 0.08)" },
                    }}
                  >
                    {action.module && (
                      <Box component="span" sx={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.5px", color: "#00BCD4", textTransform: "uppercase" }}>
                        {action.module}
                      </Box>
                    )}
                    {action.label}
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        )}

        {/* quick-start — RECENT SESSIONS (GET /sessions?page=1) */}
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
          <Typography sx={sectionLabelSx}>RECENT SESSIONS</Typography>

          {recent.loading && <Typography sx={noteSx}>Loading sessions...</Typography>}
          {recent.error && (
            <Typography sx={{ ...noteSx, color: ERROR }}>
              Couldn&apos;t load recent sessions: {recent.error}
            </Typography>
          )}
          {!recent.loading && !recent.error && recentItems.length === 0 && (
            <Typography sx={noteSx}>No sessions yet — start one above.</Typography>
          )}

          {/* suggestion-chips 2x2 grid */}
          {recentItems.length > 0 && (
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
            {recentItems.map((session) => (
              <Box
                key={session.id}
                onClick={() =>
                  navigate(WORKFLOW_ROUTE, {
                    state: { sessionId: session.id },
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
                  CONTINUE{session.module ? ` · ${session.module}` : ""}
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
                  {session.title || "Untitled session"}
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
                  Updated {formatUtcDateTime(session.updatedAt)}
                </Typography>
              </Box>
            ))}
          </Box>
          )}
        </Box>

        {/* stat tiles — GET /dashboard/summary */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%" }}>
          <Typography sx={sectionLabelSx}>AT A GLANCE</Typography>
          {summary.error ? (
            <Typography sx={{ ...noteSx, color: ERROR }}>
              Couldn&apos;t load dashboard summary: {summary.error}
            </Typography>
          ) : (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(4, 1fr)" },
                gap: "12px",
                width: "100%",
              }}
            >
              {STAT_TILES.map((tile) => {
                const value = summary.data?.[tile.key];
                return (
                  <Box
                    key={tile.key}
                    sx={{
                      boxSizing: "border-box",
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                      padding: "14px 16px",
                      background: "#FFFFFF",
                      border: "1px solid #EBEDF2",
                      boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.0392157)",
                      borderRadius: "12px",
                    }}
                  >
                    <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: "22px", lineHeight: "26px", color: "#1A1F26" }}>
                      {summary.loading ? "…" : formatCount(value)}
                    </Typography>
                    <Typography sx={{ fontFamily: FONT, fontWeight: 400, fontSize: "11px", lineHeight: "13px", color: "#8C99A6" }}>
                      {tile.label}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          )}
        </Box>
      </Box>

      <ComposerAddPopover
        anchorEl={addAnchorEl}
        onClose={() => setAddAnchorEl(null)}
        composer={composer}
        onCreateProject={() => setCreateModalOpen(true)}
      />

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

export default HomePage;
