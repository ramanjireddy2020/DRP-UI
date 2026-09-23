import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import {
  ChevronLeftOutlined,
  ChevronRightOutlined,
  DeleteOutlineOutlined,
} from "@mui/icons-material";
import { listSessions, deleteSession } from "../../services/api/sessions";
import { formatUtcDateTime, buildPageList } from "../../utils/formatDate";

const FONT = "'Inter', sans-serif";

/* ── App-wide accent, confirmed 00BCD4 across badge text / status dot / pin ── */
const TEAL = "#00BCD4";

/* ── Tokens pulled from this round's Figma dev-mode crops ────────────────
   top-nav          height 63, padding 16/32/16/32, bg #FFFFFF, border-bottom #EAECF0
   breadcrumb text  Inter 500/13px, #3D4451
   card             padding 36/40/32/40, gap 24, radius 12, border #E2E8F0,
                     shadow 0px 2px 8px rgba(0,0,0,0.039)
   page title       Inter 700/24px, #111827
   page subtitle    Inter 400/14px, #6B7280
   search-box       height 34 (Hug), radius 8, border #E0E5EB, padding 9/14/9/14, gap 8
   search icon      13x13, #9CA3AF
   placeholder      Inter 400/13px, #9CA3AF
   filter-chip      height 30 (Hug), radius 6, padding 7/14/7/14
   chip active      bg #00BCD4, text #FFFFFF (Inter 500/13px)
   chip inactive    bg #FFFFFF, border #E5E8ED, text #4B5563 (Inter 400/13px)

   sessions-list    Fill(1120) x Hug(665), radius 10, border #E5E7EB, bg #FFFFFF
   session-card     Fill(1120) x Hug(95), border-bottom 1px #F0F2F5,
                     padding 16/20/16/20, gap 5 (vertical stack)
   top-row          Fill(1080) x Hug(19), horizontal, gap 8
   module badge     Hug(45) x Hug(19), radius 4, padding 3/8/3/8, bg per-module
   badge text       Inter 600/11px, color per-module
   status frame     Hug x Hug(13), horizontal, gap 5 (dot + label)
   status dot       6x6 ellipse, color per-status
   status text      Inter 400/11px, #6B7280 (uniform across statuses)
   pin-icon         14x14, vector 8.17x8.75 stroke 1.33px #00BCD4
   timestamp text   Inter 400/11px, #9CA3AF
   title text       Inter 600/15px, #111827
   subtitle text    Inter 400/13px, #6B7280

   pagination       Fill(1120) x Hug(40), padding-top 8, gap 8
   btn-prev/next    Fixed 32x32, radius 4, bg #F1F5F9
   page (inactive)  Fixed 32x32, radius 4, bg #F1F5F9, label Inter 500/12px #6B7280 centered
   page (active)    Fixed 32x32, radius 4, border 1.5px #00BCD4, transparent bg
   "showing" text   Inter 400/12px, #6B7280

   search icon      confirmed as the literal "🔍" glyph (not a vector), boxed at 13x13,
                     Inter 400/13px, color #9CA3AF
   ------------------------------------------------------------------------ */
const TOPNAV_BORDER = "#EAECF0";
const BREADCRUMB_COLOR = "#3D4451";
const CARD_BORDER = "#E2E8F0";
const PAGE_TITLE_COLOR = "#111827";
const SUBTITLE_COLOR = "#6B7280";
const SEARCH_BORDER = "#E0E5EB";
const SEARCH_ICON_COLOR = "#9CA3AF";
const CHIP_ACTIVE_BG = "#00BCD4";
const CHIP_BORDER = "#E5E8ED";
const CHIP_TEXT_INACTIVE = "#4B5563";
const LIST_BORDER = "#E5E7EB";

const ROW_BORDER = "#F0F2F5";
const TITLE_COLOR = "#111827";
const TEXT_MUTED = "#6B7280"; // subtitle / status label
const TEXT_MUTED_LIGHT = "#9CA3AF"; // timestamp / placeholder / search icon
const BG = "#F8FAFC";

const MODULE_TAGS = ["All", "TxKG", "LitMineX", "ScreenSuite", "CurateX", "NovSearch"];

/* Text colors confirmed directly from Figma dev-mode ("Colors" panel per badge).
   Background tints are estimated as a light wash of the text color where the
   exact bg hex wasn't captured (only TxKG's #E6F7F6 was inspected directly). */
const MODULE_COLORS = {
  TxKG: { color: TEAL, bg: "#E6F7F6" },
  LitMineX: { color: "#5966C7", bg: "#EEF0FC" },
  ScreenSuite: { color: "#A64D94", bg: "#FBEEF6" },
  CurateX: { color: "#00BCD4", bg: "#E6F7F6" },
  // NovSearch bg/text not present in this round's crops — kept as prior best guess
  NovSearch: { color: "#4338CA", bg: "#E0E7FF" },
};

/* Status dot colors confirmed per-status from Figma; label color is uniform #6B7280 */
const STATUS_DOT_COLORS = {
  Completed: "#00BCD4",
  "In Progress": "#F59E0B",
  Saved: "#94A3B8",
};

/* Status filter values from the collection: Completed | In Progress | Saved. */
const STATUS_TAGS = ["All", "Completed", "In Progress", "Saved"];

const WORKFLOW_ROUTE = "/dashboard/new-research/workflow";
const SEARCH_DEBOUNCE_MS = 300;

const errorText = (err, fallback) => err?.userMessage || err?.message || fallback;

/* Figma's "search icon" is literally the 🔍 glyph as a text node — Width 13,
   Height 13, Inter 400/13px, color #9CA3AF — not a custom vector. Rendering
   it as the same character keeps it pixel-identical to the design. */
function SearchIcon() {
  return (
    <Box
      component="span"
      sx={{
        width: "13px",
        height: "13px",
        fontSize: "13px",
        lineHeight: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        color: SEARCH_ICON_COLOR,
      }}
    >
      🔍
    </Box>
  );
}

const PAGE_BTN_BG = "#F1F5F9"; // btn-prev / btn-next / inactive page numbers
const PAGE_BTN_LABEL = "#6B7280"; // inactive page-number label color

/* PageButton — Fixed 32x32, radius 4. Inactive (incl. prev/next chevrons):
   bg #F1F5F9. Active: transparent bg, 1.5px #00BCD4 border. Numeric labels
   are Inter 500/12px, centered — #6B7280 inactive, teal when active. */
function PageButton({ children, active, onClick, disabled, "aria-label": ariaLabel }) {
  return (
    <Box
      component="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "32px",
        height: "32px",
        padding: 0,
        borderRadius: "4px",
        border: active ? `1.5px solid ${TEAL}` : "1.5px solid transparent",
        background: active ? "transparent" : PAGE_BTN_BG,
        color: disabled ? "#CBD5E1" : active ? TEAL : PAGE_BTN_LABEL,
        cursor: disabled ? "default" : "pointer",
        fontFamily: FONT,
        fontSize: "12px",
        fontWeight: 500,
        lineHeight: 1,
        boxSizing: "border-box",
        transition: "background 0.15s, border-color 0.15s",
        "&:hover": disabled ? {} : { background: active ? "transparent" : "#E7ECF3" },
      }}
    >
      {children}
    </Box>
  );
}

const RecentSessionsPage = () => {
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeModule, setActiveModule] = useState("All");
  const [activeStatus, setActiveStatus] = useState("All");
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);

  const [sessions, setSessions] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  // Server-side filtering and pagination: GET /sessions?search&module&status&page
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    const params = { page };
    if (debouncedSearch) params.search = debouncedSearch;
    if (activeModule !== "All") params.module = activeModule;
    if (activeStatus !== "All") params.status = activeStatus;

    listSessions(params)
      .then((data) => {
        if (!active) return;
        setSessions(Array.isArray(data?.items) ? data.items : []);
        setTotalPages(Math.max(1, Number(data?.totalPages) || 1));
      })
      .catch((err) => {
        if (!active) return;
        setSessions([]);
        setError(errorText(err, "Failed to load sessions"));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [debouncedSearch, activeModule, activeStatus, page, refreshKey]);

  const openSession = (sessionId) =>
    navigate(WORKFLOW_ROUTE, { state: { sessionId } });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteSession(deleteTarget.id);
      setDeleteTarget(null);
      if (sessions.length === 1 && page > 1) setPage(page - 1);
      else setRefreshKey((k) => k + 1);
    } catch (err) {
      setDeleteError(errorText(err, "Failed to delete session"));
    } finally {
      setDeleting(false);
    }
  };

  const renderChip = (tag, active, onClick) => (
    <Box
      key={tag}
      onClick={onClick}
      sx={{
        height: "30px",
        padding: "7px 14px",
        borderRadius: "6px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        boxSizing: "border-box",
        bgcolor: active ? CHIP_ACTIVE_BG : "#fff",
        border: `1px solid ${active ? CHIP_ACTIVE_BG : CHIP_BORDER}`,
        "&:hover": { bgcolor: active ? "#00A8BD" : BG },
      }}
    >
      <Typography
        sx={{
          fontFamily: FONT,
          fontSize: "13px",
          fontWeight: active ? 500 : 400,
          color: active ? "#FFFFFF" : CHIP_TEXT_INACTIVE,
          lineHeight: 1,
          whiteSpace: "nowrap",
        }}
      >
        {tag}
      </Typography>
    </Box>
  );

  const centerNote = (content) => (
    <Box sx={{ minHeight: "180px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "10px" }}>
      {content}
    </Box>
  );

  return (
    <Box
      sx={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        bgcolor: BG,
        boxSizing: "border-box",
      }}
    >
      {/* top-nav — Fill × Hug(63), padding 16/32/16/32, border-bottom #EAECF0 */}
      <Box
        sx={{
          flexShrink: 0,
          height: "63px",
          bgcolor: "#FFFFFF",
          borderBottom: `1px solid ${TOPNAV_BORDER}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 32px",
          boxSizing: "border-box",
        }}
      >
        <Typography sx={{ fontFamily: FONT, fontSize: "13px", fontWeight: 500, color: BREADCRUMB_COLOR, lineHeight: 1 }}>
          Recent Sessions
        </Typography>
      </Box>

      {/* content area — the card fills the remaining space, flush (no outer margin) */}
      <Box sx={{ flex: 1, minHeight: 0, display: "flex" }}>
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            gap: "24px",
            padding: "36px 40px 32px",
            bgcolor: "#fff",
            border: `1px solid ${CARD_BORDER}`,
            borderRadius: "12px",
            boxShadow: "0px 2px 8px rgba(0,0,0,0.039)",
            boxSizing: "border-box",
            overflow: "hidden",
          }}
        >
          {/* page-header — gap 6 */}
          <Box sx={{ flexShrink: 0, display: "flex", flexDirection: "column", gap: "6px" }}>
            <Typography sx={{ fontFamily: FONT, fontSize: "24px", fontWeight: 700, color: PAGE_TITLE_COLOR, lineHeight: 1 }}>
              Recent Research Sessions
            </Typography>
            <Typography sx={{ fontFamily: FONT, fontSize: "14px", fontWeight: 400, color: SUBTITLE_COLOR, lineHeight: 1 }}>
              Resume previous research threads or review completed analyses.
            </Typography>
          </Box>

          {/* filter-bar — gap 10 */}
          <Box sx={{ flexShrink: 0, display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            {/* search-box — Fill × Hug(34), radius 8, border #E0E5EB, padding 9/14, gap 8 */}
            <Box
              sx={{
                flex: "1 1 260px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                height: "34px",
                padding: "9px 14px",
                bgcolor: "#fff",
                border: `1px solid ${SEARCH_BORDER}`,
                borderRadius: "8px",
                boxSizing: "border-box",
              }}
            >
              <SearchIcon />
              <TextField
                variant="standard"
                placeholder="Search sessions by target, disease, or module..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                fullWidth
                InputProps={{ disableUnderline: true }}
                sx={{
                  "& input": { fontFamily: FONT, fontSize: "13px", color: TITLE_COLOR, py: 0 },
                  "& input::placeholder": { color: TEXT_MUTED_LIGHT, opacity: 1 },
                }}
              />
            </Box>

            {/* filter chips — height 30, radius 6, padding 7/14/7/14 */}
            <Box sx={{ display: "flex", gap: "8px", flexWrap: "wrap", flexShrink: 0 }}>
              {MODULE_TAGS.map((tag) =>
                renderChip(tag, activeModule === tag, () => {
                  setActiveModule(tag);
                  setPage(1);
                })
              )}
            </Box>
          </Box>

          {/* status filter — same chip style */}
          <Box sx={{ flexShrink: 0, display: "flex", gap: "8px", flexWrap: "wrap", mt: "-12px" }}>
            {STATUS_TAGS.map((tag) =>
              renderChip(tag, activeStatus === tag, () => {
                setActiveStatus(tag);
                setPage(1);
              })
            )}
          </Box>

          {/* sessions-list — Fill(1120) × Hug(665), radius 10, border #E5E7EB */}
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              bgcolor: "#FFFFFF",
              border: `1px solid ${LIST_BORDER}`,
              borderRadius: "10px",
              overflow: "hidden",
              boxSizing: "border-box",
            }}
          >
            <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
              {loading &&
                centerNote(<CircularProgress size={20} sx={{ color: TEAL }} />)}

              {!loading && error &&
                centerNote(
                  <>
                    <Typography role="alert" sx={{ fontFamily: FONT, fontSize: "14px", color: "#DC2626" }}>
                      Couldn&apos;t load sessions: {error}
                    </Typography>
                    <Button onClick={() => setRefreshKey((k) => k + 1)} sx={{ textTransform: "none", fontFamily: FONT, color: TEAL }}>
                      Retry
                    </Button>
                  </>
                )}

              {!loading && !error && sessions.length === 0 &&
                centerNote(
                  <Typography sx={{ fontFamily: FONT, fontSize: "14px", color: TEXT_MUTED_LIGHT }}>
                    No sessions found
                  </Typography>
                )}

              {!loading && !error && sessions.map((s, i) => {
                const mc = MODULE_COLORS[s.module] || { color: TEXT_MUTED_LIGHT, bg: BG };
                const dotColor = STATUS_DOT_COLORS[s.status] || TEXT_MUTED_LIGHT;

                return (
                  <Box
                    key={s.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openSession(s.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") openSession(s.id);
                    }}
                    sx={{
                      /* session-card — Fill(1120) x Hug(95), padding 16/20/16/20, gap 5 (vertical) */
                      display: "flex",
                      flexDirection: "column",
                      gap: "5px",
                      padding: "16px 20px",
                      borderBottom: i === sessions.length - 1 ? "none" : `1px solid ${ROW_BORDER}`,
                      cursor: "pointer",
                      boxSizing: "border-box",
                      "&:hover": { bgcolor: BG },
                    }}
                  >
                    {/* top-row — Fill(1080) x Hug(19), horizontal, gap 8 */}
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "8px",
                        width: "100%",
                      }}
                    >
                      {/* left cluster: module badge + status */}
                      <Box sx={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        {/* module badge — Hug(45) x Hug(19), radius 4, padding 3/8/3/8 */}
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            padding: "3px 8px",
                            borderRadius: "4px",
                            bgcolor: mc.bg,
                            width: "fit-content",
                          }}
                        >
                          <Typography
                            sx={{
                              fontFamily: FONT,
                              fontSize: "11px",
                              fontWeight: 600,
                              color: mc.color,
                              lineHeight: 1,
                            }}
                          >
                            {s.module}
                          </Typography>
                        </Box>

                        {/* status frame — Hug x Hug(13), horizontal, gap 5 */}
                        <Box sx={{ display: "flex", alignItems: "center", gap: "5px" }}>
                          <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: dotColor, flexShrink: 0 }} />
                          <Typography sx={{ fontFamily: FONT, fontSize: "11px", fontWeight: 400, color: TEXT_MUTED, lineHeight: 1 }}>
                            {s.status}
                          </Typography>
                        </Box>
                      </Box>

                      {/* right cluster: timestamp (updatedAt, UTC) + delete */}
                      <Box sx={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                        <Typography sx={{ fontFamily: FONT, fontSize: "11px", fontWeight: 400, color: TEXT_MUTED_LIGHT, lineHeight: 1, whiteSpace: "nowrap" }}>
                          {formatUtcDateTime(s.updatedAt)}
                        </Typography>
                        <Box
                          component="button"
                          type="button"
                          aria-label={`Delete session ${s.title || s.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteError(null);
                            setDeleteTarget(s);
                          }}
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "22px",
                            height: "22px",
                            p: 0,
                            border: "none",
                            borderRadius: "4px",
                            bgcolor: "transparent",
                            cursor: "pointer",
                            "&:hover": { bgcolor: "#FEF2F2", "& svg": { color: "#EF4444" } },
                          }}
                        >
                          <DeleteOutlineOutlined sx={{ fontSize: 15, color: TEXT_MUTED_LIGHT }} />
                        </Box>
                      </Box>
                    </Box>

                    {/* title — Inter 600/15px, #111827 */}
                    <Typography sx={{ fontFamily: FONT, fontSize: "15px", fontWeight: 600, color: TITLE_COLOR, lineHeight: 1 }}>
                      {s.title || "Untitled session"}
                    </Typography>

                    {/* subtitle — Inter 400/13px, #6B7280 (API: summary) */}
                    {s.summary && (
                      <Typography sx={{ fontFamily: FONT, fontSize: "13px", fontWeight: 400, color: TEXT_MUTED, lineHeight: 1.3 }}>
                        {s.summary}
                      </Typography>
                    )}
                  </Box>
                );
              })}
            </Box>
          </Box>

          {/* pagination — separate sibling frame below sessions-list (not nested
              inside its border). Fill(1104 within the card's padded content) x
              Hug(40), padding-top 8, gap 8. All controls sit together as one
              centered group, not split edge-to-edge. */}
          <Box
            sx={{
              flexShrink: 0,
              width: "100%",
              pt: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexWrap: "wrap",
              gap: "8px",
              boxSizing: "border-box",
            }}
          >
            <PageButton
              aria-label="Previous page"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeftOutlined sx={{ fontSize: 16 }} />
            </PageButton>

            {buildPageList(page, totalPages).map((n, idx) =>
              n === "…" ? (
                <Box key={`gap-${idx}`} sx={{ px: "4px", color: PAGE_BTN_LABEL, fontFamily: FONT, fontSize: "12px" }}>&hellip;</Box>
              ) : (
                <PageButton key={n} active={page === n} onClick={() => setPage(n)}>
                  {n}
                </PageButton>
              )
            )}

            <PageButton
              aria-label="Next page"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              <ChevronRightOutlined sx={{ fontSize: 16 }} />
            </PageButton>

            <Typography sx={{ fontFamily: FONT, fontSize: "12px", fontWeight: 400, color: TEXT_MUTED, whiteSpace: "nowrap", ml: "8px" }}>
              Page {page} of {totalPages}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Delete confirm — DELETE /sessions/{id} */}
      <Dialog open={Boolean(deleteTarget)} onClose={() => !deleting && setDeleteTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontFamily: FONT, fontWeight: 700, fontSize: "18px" }}>Delete session?</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontFamily: FONT, fontSize: "14px", color: TITLE_COLOR }}>
            &ldquo;{deleteTarget?.title || deleteTarget?.id}&rdquo; and its steps and messages will be deleted.
          </Typography>
          {deleteError && (
            <Typography role="alert" sx={{ fontFamily: FONT, fontSize: "13px", color: "#DC2626", mt: 1 }}>
              {deleteError}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleting} sx={{ textTransform: "none", fontFamily: FONT, color: TITLE_COLOR }}>
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            disabled={deleting}
            sx={{ textTransform: "none", fontFamily: FONT, color: "#FFFFFF", bgcolor: "#EF4444", "&:hover": { bgcolor: "#DC2626" } }}
          >
            {deleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RecentSessionsPage;