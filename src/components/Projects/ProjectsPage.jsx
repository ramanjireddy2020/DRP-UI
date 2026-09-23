import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  TextField,
  Select,
  MenuItem,
  Popover,
  Divider,
  Dialog,
  DialogContent,
  DialogActions,
  Button,
} from "@mui/material";

import {
  SearchOutlined,
  AddOutlined,
  ChevronLeftOutlined,
  ChevronRightOutlined,
  MoreVertOutlined,
  CloseOutlined,
  KeyboardArrowDownOutlined,
} from "@mui/icons-material";
import {
  listProjects,
  readProjectList,
  createProject,
  updateProject,
  deleteProject,
  PROJECT_STATUSES,
} from "../../services/api/projects";
import { formatUtcDate, buildPageList } from "../../utils/formatDate";
import "./irenovo-create-new-project.css";

/* ─────────────────────────────────────────────────────────────
   DESIGN TOKENS
───────────────────────────────────────────────────────────── */

const FONT = "'Inter', sans-serif";

const TEAL = "#00BCD4";

const TOPNAV_BORDER = "#E2E8F0";
const BREADCRUMB_COLOR = "#64748B";
const TITLE_COLOR = "#0F172A";
const SUBTITLE_COLOR = "#64748B";
const CARD_BORDER = "#E2E8F0";
const SEARCH_ICON_COLOR = "#CBD5E1";
const DROPDOWN_LABEL_COLOR = "#64748B";
const DROPDOWN_VALUE_COLOR = "#0F172A";
const MUTED = "#94A3B8";
const BG = "#F8FAFC";

/*
  Shared table column definition.

  IMPORTANT:
  The exact same grid is used by:
  - table header
  - table rows

  This keeps Disease, Last Module and Status perfectly aligned.
*/
const TABLE_GRID = "minmax(220px, 1fr) 230px 155px 130px 120px 40px";
const TABLE_MIN_WIDTH = "895px";

const errorText = (err, fallback) => err?.userMessage || err?.message || fallback;

/* ─────────────────────────────────────────────────────────────
   STATUS COLORS
───────────────────────────────────────────────────────────── */

/* Keyed by the API's own Title Case values ("Active" | "On Hold" | "Review"). */
const STATUS_META = {
  Active: {
    color: "#0D9488",
    bg: "#E6FAF7",
  },

  "On Hold": {
    color: "#7C3AED",
    bg: "#EDE9FE",
  },

  Review: {
    color: "#D97706",
    bg: "#FEF3C7",
  },
};

/* ─────────────────────────────────────────────────────────────
   STATUS CHIP
───────────────────────────────────────────────────────────── */

const StatusChip = ({ status, onClick }) => {
  const { color, bg } =
    STATUS_META[status] || {
      color: MUTED,
      bg: "#F1F5F9",
    };

  return (
    <Box
      component="button"
      onClick={(event) => {
        event.stopPropagation();

        if (onClick) {
          onClick(event);
        }
      }}
      sx={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",

        px: "8px",
        py: "3px",

        minHeight: "28px",

        border: "none",
        borderRadius: "4px",

        bgcolor: bg,
        color,

        cursor: "pointer",

        fontFamily: FONT,

        "&:hover": {
          filter: "brightness(0.98)",
        },
      }}
    >
      <Typography
        sx={{
          fontFamily: FONT,
          fontSize: "11px",
          fontWeight: 700,
          color,
          letterSpacing: "0.4px",
          lineHeight: 1,
          textTransform: "uppercase",
        }}
      >
        {status || "—"}
      </Typography>
    </Box>
  );
};

/* ─────────────────────────────────────────────────────────────
   FILTER SELECT
───────────────────────────────────────────────────────────── */

const FilterSelect = ({
  value,
  onChange,
  options,
  label,
  allLabel,
}) => {
  return (
    <Select
      value={value}
      onChange={onChange}
      size="small"
      displayEmpty
      IconComponent={() => null}
      renderValue={(selectedValue) => (
        <Box
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            maxWidth: "100%",
            minWidth: 0,
            whiteSpace: "nowrap",
            overflow: "hidden",
          }}
        >
          <Typography
            component="span"
            sx={{
              flexShrink: 0,
              fontFamily: FONT,
              fontSize: "13px",
              fontWeight: 400,
              color: DROPDOWN_LABEL_COLOR,
              lineHeight: 1,
              whiteSpace: "nowrap",
            }}
          >
            {label}:
          </Typography>

          <Typography
            component="span"
            sx={{
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              fontFamily: FONT,
              fontSize: "13px",
              fontWeight: 600,
              color: DROPDOWN_VALUE_COLOR,
              lineHeight: 1,
              whiteSpace: "nowrap",
            }}
          >
            {selectedValue || allLabel}
          </Typography>

          <KeyboardArrowDownOutlined
            sx={{
              flexShrink: 0,
              marginLeft: "1px",
              fontSize: "16px",
              color: "#64748B",
              pointerEvents: "none",
            }}
          />
        </Box>
      )}
      sx={{
        width: "100%",
        height: "40px",
        minWidth: 0,
        bgcolor: "#FFFFFF",
        borderRadius: "8px",
        flexShrink: 0,

        "& .MuiOutlinedInput-notchedOutline": {
          borderColor: CARD_BORDER,
          borderWidth: "1px",
        },

        "&:hover .MuiOutlinedInput-notchedOutline": {
          borderColor: "#CBD5E1",
        },

        "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
          borderColor: TEAL,
          borderWidth: "1px",
        },

        "& .MuiSelect-select": {
          width: "100%",
          minHeight: "unset !important",
          height: "40px",
          display: "flex",
          alignItems: "center",
          boxSizing: "border-box",
          padding: "0 12px 0 14px !important",
          overflow: "hidden",
          whiteSpace: "nowrap",
        },

      }}
    >
      <MenuItem
        value=""
        sx={{
          fontFamily: FONT,
          fontSize: "13px",
        }}
      >
        {allLabel}
      </MenuItem>

      {options.map((option) => (
        <MenuItem
          key={option}
          value={option}
          sx={{
            fontFamily: FONT,
            fontSize: "13px",
          }}
        >
          {option}
        </MenuItem>
      ))}
    </Select>
  );
};

/* ─────────────────────────────────────────────────────────────
   SORT SELECT
───────────────────────────────────────────────────────────── */

const SortSelect = ({ value, onChange }) => {
  return (
    <Select
      value={value}
      onChange={onChange}
      size="small"
      IconComponent={() => null}
      renderValue={(selectedValue) => (
        <Box
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            maxWidth: "100%",
            minWidth: 0,
            whiteSpace: "nowrap",
            overflow: "hidden",
          }}
        >
          <Typography
            component="span"
            sx={{
              flexShrink: 0,
              fontFamily: FONT,
              fontSize: "13px",
              fontWeight: 400,
              color: DROPDOWN_LABEL_COLOR,
              lineHeight: 1,
              whiteSpace: "nowrap",
            }}
          >
            Sort by:
          </Typography>

          <Typography
            component="span"
            sx={{
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              fontFamily: FONT,
              fontSize: "13px",
              fontWeight: 600,
              color: DROPDOWN_VALUE_COLOR,
              lineHeight: 1,
              whiteSpace: "nowrap",
            }}
          >
            {selectedValue}
          </Typography>

          <KeyboardArrowDownOutlined
            sx={{
              flexShrink: 0,
              marginLeft: "1px",
              fontSize: "16px",
              color: "#64748B",
              pointerEvents: "none",
            }}
          />
        </Box>
      )}
      sx={{
        width: "100%",
        height: "40px",
        minWidth: 0,
        bgcolor: "#FFFFFF",
        borderRadius: "8px",
        flexShrink: 0,

        "& .MuiOutlinedInput-notchedOutline": {
          borderColor: CARD_BORDER,
          borderWidth: "1px",
        },

        "&:hover .MuiOutlinedInput-notchedOutline": {
          borderColor: "#CBD5E1",
        },

        "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
          borderColor: TEAL,
          borderWidth: "1px",
        },

        "& .MuiSelect-select": {
          width: "100%",
          minHeight: "unset !important",
          height: "40px",
          display: "flex",
          alignItems: "center",
          boxSizing: "border-box",
          padding: "0 12px 0 14px !important",
          overflow: "hidden",
          whiteSpace: "nowrap",
        },

      }}
    >
      {["Latest Activity", "Name", "Status"].map((option) => (
        <MenuItem
          key={option}
          value={option}
          sx={{
            fontFamily: FONT,
            fontSize: "13px",
          }}
        >
          {option}
        </MenuItem>
      ))}
    </Select>
  );
};

/* ─────────────────────────────────────────────────────────────
   STATUS DROPDOWN
   Figma:
   Width: 180px
   Height: 216px
   Radius: 8px
   Padding top/bottom: 8px
───────────────────────────────────────────────────────────── */

const StatusDropdown = ({
  anchorEl,
  open,
  onClose,
  currentStatus,
  onStatusChange,
}) => {
  const statuses = [
    {
      value: "Active",
      label: "Active",
      color: "#00BCD4",
      bg: "#E6FAF7",
    },
    {
      value: "Review",
      label: "In Review",
      color: "#F59E0B",
      bg: "#FEF3C7",
    },
    {
      value: "On Hold",
      label: "On Hold",
      color: "#8B5CF6",
      bg: "#F0EBFF",
    },
  ];

  const handleStatusChange = (status) => {
    onStatusChange?.(status);
    onClose();
  };

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{
        vertical: "bottom",
        horizontal: "left",
      }}
      transformOrigin={{
        vertical: "top",
        horizontal: "left",
      }}
      slotProps={{
        paper: {
          sx: {
            width: "180px",
            mt: "8px",
            borderRadius: "8px",
            bgcolor: "#FFFFFF",
            overflow: "hidden",
            boxShadow: "0px 4px 16px rgba(0, 0, 0, 0.12)",
            border: "none",
          },
        },
      }}
    >
      <Box
        sx={{
          width: "180px",
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box",
          py: "8px",
        }}
      >
        {/* Figma: dropdown-header — 180 Fill × 24 Hug, padding 6px 14px */}
        <Box
          sx={{
            width: "180px",
            height: "24px",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            boxSizing: "border-box",
            px: "14px",
            py: "6px",
          }}
        >
          <Typography
            sx={{
              fontFamily: FONT,
              fontSize: "12px",
              fontWeight: 700,
              color: "#64748B",
              letterSpacing: "0.5px",
              lineHeight: "12px",
              textTransform: "uppercase",
            }}
          >
            Set Status
          </Typography>
        </Box>

        <Divider sx={{ borderColor: "#E2E8F0", flexShrink: 0 }} />

        {/* Figma: each option — 180 Fill × 35 Hug, padding 7px 14px, gap 10px */}
        <Box
          sx={{
            width: "180px",
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {statuses.map((status) => {
            const selected = currentStatus === status.value;

            return (
              <Box
                key={status.value}
                onClick={(event) => {
                  event.stopPropagation();
                  handleStatusChange(status.value);
                }}
                sx={{
                  width: "180px",
                  height: "35px",
                  minHeight: "35px",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  boxSizing: "border-box",
                  px: "14px",
                  py: "7px",
                  gap: "10px",
                  bgcolor: selected ? "#F5F7FA" : "#FFFFFF",
                  cursor: "pointer",
                  "&:hover": {
                    bgcolor: "#F5F7FA",
                  },
                }}
              >
                <Box
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "fit-content",
                    minWidth: "fit-content",
                    px: "12px",
                    py: "6px",
                    borderRadius: "14px",
                    bgcolor: status.bg,
                    boxSizing: "border-box",
                  }}
                >
                  <Typography
                    sx={{
                      fontFamily: FONT,
                      fontSize: "12px",
                      fontWeight: 500,
                      color: status.color,
                      lineHeight: "12px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {status.label}
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Box>
      </Box>
    </Popover>
  );
};

/* ─────────────────────────────────────────────────────────────
   ACTIONS DROPDOWN
   Figma:
   Width: 160px
   Height: 157px
   Radius: 8px
   Padding top/bottom: 6px
───────────────────────────────────────────────────────────── */

const ActionsDropdown = ({
  anchorEl,
  open,
  onClose,
  onAction,
}) => {
  // Duplicate / Archive are hidden: the API has no endpoint for either.
  const actions = [
    { value: "edit", label: "Edit Project" },
    { value: "delete", label: "Delete", danger: true },
  ];

  const handleAction = (action) => {
    onAction?.(action);
    onClose();
  };

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{
        vertical: "bottom",
        horizontal: "right",
      }}
      transformOrigin={{
        vertical: "top",
        horizontal: "right",
      }}
      slotProps={{
        paper: {
          sx: {
            width: "160px",
            mt: "6px",
            borderRadius: "8px",
            bgcolor: "#FFFFFF",
            overflow: "hidden",
            boxShadow: "0px 4px 16px rgba(0, 0, 0, 0.12)",
            border: "none",
          },
        },
      }}
    >
      <Box
        sx={{
          width: "160px",
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box",
          py: "6px",
        }}
      >
        {actions.map((action) => (
          <React.Fragment key={action.value}>
            {action.value === "delete" && (
              <Divider
                sx={{
                  borderColor: "#E2E8F0",
                  flexShrink: 0,
                }}
              />
            )}

            <Box
              onClick={(event) => {
                event.stopPropagation();
                handleAction(action.value);
              }}
              sx={{
                height: "44px",
                display: "flex",
                alignItems: "center",
                px: "24px",
                cursor: "pointer",
                "&:hover": {
                  bgcolor: "#F8FAFC",
                },
              }}
            >
              <Typography
                sx={{
                  fontFamily: FONT,
                  fontSize: "16px",
                  fontWeight: 400,
                  color: action.danger ? "#EF4444" : "#333333",
                  lineHeight: 1,
                  whiteSpace: "nowrap",
                }}
              >
                {action.label}
              </Typography>
            </Box>
          </React.Fragment>
        ))}
      </Box>
    </Popover>
  );
};

/* ─────────────────────────────────────────────────────────────
   PAGINATION BUTTON
───────────────────────────────────────────────────────────── */

function PageButton({
  children,
  active,
  onClick,
  disabled,
  "aria-label": ariaLabel,
}) {
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

        border: active
          ? `1.5px solid ${TEAL}`
          : "1.5px solid transparent",

        background: active
          ? "transparent"
          : "#F1F5F9",

        color: disabled
          ? "#CBD5E1"
          : active
          ? TEAL
          : "#6B7280",

        cursor: disabled
          ? "default"
          : "pointer",

        fontFamily: FONT,
        fontSize: "12px",
        fontWeight: 500,

        lineHeight: 1,

        boxSizing: "border-box",

        transition:
          "background 0.15s, border-color 0.15s",

        "&:hover": disabled
          ? {}
          : {
              background: active
                ? "transparent"
                : "#E7ECF3",
            },
      }}
    >
      {children}
    </Box>
  );
}

/* ─────────────────────────────────────────────────────────────
   PROJECTS PAGE
───────────────────────────────────────────────────────────── */

const SEARCH_DEBOUNCE_MS = 300;

const SORTERS = {
  "Latest Activity": (a, b) =>
    String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")),
  Name: (a, b) => String(a.name || "").localeCompare(String(b.name || "")),
  Status: (a, b) => String(a.status || "").localeCompare(String(b.status || "")),
};

const ProjectsPage = () => {
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] =
    useState("Latest Activity");

  const [page, setPage] = useState(1);

  /* Bumped to force a refetch (after create / delete). */
  const [refreshKey, setRefreshKey] = useState(0);
  const refetch = () => setRefreshKey((k) => k + 1);

  /* Status dropdown state */
  const [statusAnchorEl, setStatusAnchorEl] =
    useState(null);

  const [selectedProjectId, setSelectedProjectId] =
    useState(null);

  /* Actions dropdown state */
  const [actionsAnchorEl, setActionsAnchorEl] =
    useState(null);

  const [actionProjectId, setActionProjectId] =
    useState(null);

  /* API-driven projects state */
  const [projects, setProjects] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /* Errors from row actions (status / rename / delete) */
  const [actionError, setActionError] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let mounted = true;

    const fetchProjects = async () => {
      setLoading(true);
      setError(null);

      try {
        // Contract query params only: search, status, page.
        const params = { page };
        if (debouncedSearch) params.search = debouncedSearch;
        if (statusFilter) params.status = statusFilter;

        const data = readProjectList(await listProjects(params));

        if (!mounted) return;

        setProjects(data.items);
        setTotalCount(data.totalCount);
        setTotalPages(data.totalPages);
      } catch (err) {
        if (!mounted) return;
        setProjects([]);
        setError(errorText(err, "Failed to fetch projects"));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchProjects();

    return () => {
      mounted = false;
    };
  }, [debouncedSearch, statusFilter, page, refreshKey]);

  /* The API has no sort param, so sorting applies to the current page. */
  const displayed = useMemo(
    () => [...projects].sort(SORTERS[sortBy] || SORTERS["Latest Activity"]),
    [projects, sortBy]
  );

  /* New project modal state */
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDisease, setNewProjectDisease] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState(null);

  const openNewProject = () => {
    setNewProjectDisease("");
    setNewProjectName("");
    setCreateError(null);
    setNewProjectOpen(true);
  };

  const closeNewProject = () => {
    if (!createLoading) setNewProjectOpen(false);
  };

  const handleCreateProject = async () => {
    const disease = newProjectDisease.trim();
    const name = newProjectName.trim() || `${disease} Target Analysis`;

    // Contract body: { name, disease, module, status }.
    const body = {
      name,
      disease,
      module: "TxKG",
      status: "Active",
    };

    try {
      setCreateLoading(true);
      setCreateError(null);
      await createProject(body);

      setNewProjectOpen(false);
      if (page === 1) refetch();
      else setPage(1);
    } catch (err) {
      setCreateError(errorText(err, "Failed to create project"));
    } finally {
      setCreateLoading(false);
    }
  };

  /* ─────────────────────────────────────────────
     STATUS DROPDOWN
  ───────────────────────────────────────────── */

  const handleStatusClick = (
    event,
    projectId
  ) => {
    event.stopPropagation();

    setSelectedProjectId(projectId);

    setStatusAnchorEl(event.currentTarget);
  };

  const handleStatusClose = () => {
    setStatusAnchorEl(null);
    setSelectedProjectId(null);
  };

  // Optimistic update; PATCH /projects/{id} { status }, revert on failure.
  const handleStatusChange = async (status) => {
    const projectId = selectedProjectId;
    const previous = projects.find((p) => p.id === projectId);
    if (!previous || previous.status === status) return;

    setActionError(null);
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, status } : p))
    );

    try {
      const updated = await updateProject(projectId, { status });
      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? { ...p, ...(updated || {}) } : p))
      );
    } catch (err) {
      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? previous : p))
      );
      setActionError(errorText(err, "Failed to update status"));
    }
  };

  /* ─────────────────────────────────────────────
     ACTIONS DROPDOWN
  ───────────────────────────────────────────── */

  const handleActionsClick = (
    event,
    projectId
  ) => {
    event.stopPropagation();

    setActionProjectId(projectId);

    setActionsAnchorEl(
      event.currentTarget
    );
  };

  const handleActionsClose = () => {
    setActionsAnchorEl(null);
    setActionProjectId(null);
  };

  /* Rename / delete dialogs */
  const [renameTarget, setRenameTarget] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [dialogBusy, setDialogBusy] = useState(false);
  const [dialogError, setDialogError] = useState(null);

  const handleProjectAction = (action) => {
    const project = projects.find((p) => p.id === actionProjectId);
    if (!project) return;

    setDialogError(null);
    if (action === "edit") {
      setRenameTarget(project);
      setRenameValue(project.name || "");
    } else if (action === "delete") {
      setDeleteTarget(project);
    }
  };

  const handleRename = async () => {
    const name = renameValue.trim();
    if (!renameTarget || !name) return;

    setDialogBusy(true);
    setDialogError(null);
    try {
      const updated = await updateProject(renameTarget.id, { name });
      setProjects((prev) =>
        prev.map((p) =>
          p.id === renameTarget.id ? { ...p, name, ...(updated || {}) } : p
        )
      );
      setRenameTarget(null);
    } catch (err) {
      setDialogError(errorText(err, "Failed to rename project"));
    } finally {
      setDialogBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setDialogBusy(true);
    setDialogError(null);
    try {
      await deleteProject(deleteTarget.id);
      setDeleteTarget(null);
      // Step back a page if this removed the last row on it.
      if (projects.length === 1 && page > 1) setPage(page - 1);
      else refetch();
    } catch (err) {
      setDialogError(errorText(err, "Failed to delete project"));
    } finally {
      setDialogBusy(false);
    }
  };

  /* ─────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────── */

  return (
    <Box
      sx={{
        height: "100%",
        width: "100%",

        display: "flex",
        flexDirection: "column",

        bgcolor: BG,

        boxSizing: "border-box",

        overflow: "hidden",
      }}
    >
      {/* ─────────────────────────────────────────
          TOP NAV
      ───────────────────────────────────────── */}

      <Box
        sx={{
          flexShrink: 0,

          height: "57px",

          bgcolor: "#FFFFFF",

          borderBottom:
            `1px solid ${TOPNAV_BORDER}`,

          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",

          padding: "14px 32px",

          boxSizing: "border-box",
        }}
      >
        <Typography
          sx={{
            fontFamily: FONT,
            fontSize: "13px",
            fontWeight: 500,

            color: BREADCRUMB_COLOR,

            lineHeight: 1,
          }}
        >
          Projects
        </Typography>
      </Box>

      {/* ─────────────────────────────────────────
          CONTENT
      ───────────────────────────────────────── */}

      <Box
        sx={{
          flex: 1,

          minHeight: 0,

          display: "flex",
          flexDirection: "column",

          padding: "32px",

          gap: "24px",

          "@media (max-width: 1200px)": {
            padding: "28px",
            gap: "20px",
          },

          "@media (max-width: 700px)": {
            padding: "20px",
            gap: "18px",
          },

          "@media (max-width: 520px)": {
            padding: "16px",
            gap: "16px",
          },

          boxSizing: "border-box",

          overflow: "hidden",
        }}
      >
        {/* ───────────────────────────────────────
            HEADER
        ─────────────────────────────────────── */}

        <Box
          sx={{
            flexShrink: 0,

            display: "flex",
            alignItems: "flex-start",

            justifyContent:
              "space-between",

            gap: "20px",

            "@media (max-width: 700px)": {
              flexDirection: "column",
              alignItems: "stretch",
              gap: "14px",
            },
          }}
        >
          {/* Title */}
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",

              gap: "4px",
            }}
          >
            <Typography
              sx={{
                fontFamily: FONT,
                fontSize: "28px",
                fontWeight: 700,

                color: TITLE_COLOR,

                lineHeight: "1.2",
              }}
            >
              Projects
            </Typography>

            <Typography
              sx={{
                fontFamily: FONT,
                fontSize: "14px",
                fontWeight: 400,

                color: SUBTITLE_COLOR,

                lineHeight: 1,
              }}
            >
              Manage and track your research
            </Typography>
          </Box>

          {/* New Project */}
          <Box
            component="button"
            onClick={openNewProject}
            sx={{
              display: "flex",
              alignItems: "center",

              gap: "8px",

              padding: "10px 18px",

              borderRadius: "8px",

              bgcolor: TEAL,
              color: "#FFFFFF",

              border: "none",

              cursor: "pointer",

              fontFamily: FONT,
              fontSize: "14px",
              fontWeight: 600,

              boxShadow:
                "0px 4px 12px 0px rgba(0,194,181,0.1255)",

              flexShrink: 0,

              "@media (max-width: 700px)": {
                alignSelf: "flex-start",
              },

              "&:hover": {
                bgcolor: "#00A8BD",
              },
            }}
          >
            <AddOutlined
              sx={{
                fontSize: 16,
                width: 16,
                height: 16,
              }}
            />

            New Project
          </Box>
        </Box>

        {/* ───────────────────────────────────────
            FILTER BAR
        ─────────────────────────────────────── */}

        <Box
          sx={{
            flexShrink: 0,
            width: "100%",
            display: "grid",
            /*
              Desktop: keep all four controls on one line while
              allowing the search field to take the remaining space.
              The smaller gaps also keep the controls visually grouped.
            */
            gridTemplateColumns: "minmax(0, 1fr) 165px 205px",
            alignItems: "center",
            gap: "8px",
            boxSizing: "border-box",

            "@media (max-width: 1200px)": {
              gridTemplateColumns: "minmax(0, 1fr) 155px 190px",
              gap: "8px",
            },

            "@media (max-width: 980px)": {
              gridTemplateColumns: "minmax(300px, 1fr) 180px",
              gap: "10px",
            },

            "@media (max-width: 700px)": {
              gridTemplateColumns: "1fr 1fr",
              gap: "10px",
            },

            "@media (max-width: 520px)": {
              gridTemplateColumns: "1fr",
              gap: "10px",
            },
          }}
        >
          {/* Search */}
          <TextField
            placeholder="Search projects..."
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            variant="outlined"
            InputProps={{
              startAdornment: (
                <SearchOutlined
                  sx={{
                    fontSize: "15px",
                    color:
                      SEARCH_ICON_COLOR,
                    mr: "10px",
                  }}
                />
              ),
            }}
            sx={{
              width: "100%",
              minWidth: 0,

              "& .MuiOutlinedInput-root": {
                height: "40px",

                borderRadius: "8px",

                bgcolor: "#FFFFFF",

                pl: "14px",
                pr: "14px",

                "& fieldset": {
                  borderColor: CARD_BORDER,
                },

                "&:hover fieldset": {
                  borderColor: "#CBD5E1",
                },

                "&.Mui-focused fieldset": {
                  borderColor: TEAL,
                  borderWidth: "1px",
                },
              },

              "& input": {
                fontFamily: FONT,
                fontSize: "13px",

                color: TITLE_COLOR,

                p: 0,
              },

              "& input::placeholder": {
                color: SEARCH_ICON_COLOR,
                opacity: 1,
              },
            }}
          />

          {/* Status */}
          <FilterSelect
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(
                event.target.value
              );
              setPage(1);
            }}
            options={PROJECT_STATUSES}
            label="Status"
            allLabel="All Status"
          />

          {/* Sort */}
          <SortSelect
            value={sortBy}
            onChange={(event) =>
              setSortBy(event.target.value)
            }
          />
        </Box>

        {actionError && (
          <Box
            role="alert"
            sx={{
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              px: "16px",
              py: "10px",
              borderRadius: "8px",
              bgcolor: "#FEF2F2",
              border: "1px solid #FECACA",
            }}
          >
            <Typography sx={{ fontFamily: FONT, fontSize: "13px", color: "#B91C1C" }}>
              {actionError}
            </Typography>
            <Box
              component="button"
              onClick={() => setActionError(null)}
              aria-label="Dismiss"
              sx={{ border: "none", bgcolor: "transparent", cursor: "pointer", display: "flex", p: 0 }}
            >
              <CloseOutlined sx={{ fontSize: 16, color: "#B91C1C" }} />
            </Box>
          </Box>
        )}

        {/* ───────────────────────────────────────
            TABLE CARD
        ─────────────────────────────────────── */}

        <Box
          sx={{
            flex: 1,

            minHeight: 0,

            display: "flex",
            flexDirection: "column",

            bgcolor: "#FFFFFF",

            border:
              `1px solid ${CARD_BORDER}`,

            borderRadius: "12px",

            boxShadow:
              "0px 2px 8px rgba(0,0,0,0.039)",

            overflow: "hidden",

            boxSizing: "border-box",
          }}
        >
          {/* Card title */}
          <Box
            sx={{
              px: "24px",
              py: "20px",

              flexShrink: 0,
            }}
          >
            <Typography
              sx={{
                fontFamily: FONT,
                fontSize: "16px",
                fontWeight: 600,

                color: TITLE_COLOR,
              }}
            >
              Repurposing Projects
            </Typography>
          </Box>

          {/* ─────────────────────────────────────
              TABLE HEADER

              Uses SAME TABLE_GRID as rows.
          ───────────────────────────────────── */}

          <Box
            sx={{
              display: "grid",

              gridTemplateColumns:
                TABLE_GRID,

              alignItems: "center",

              bgcolor: BG,

              px: "24px",
              py: "10px",

              borderTop:
                `1px solid ${CARD_BORDER}`,

              borderBottom:
                `1px solid ${CARD_BORDER}`,

              flexShrink: 0,

              boxSizing: "border-box",
              minWidth: TABLE_MIN_WIDTH,
            }}
          >
            <Typography
              sx={{
                fontFamily: FONT,
                fontSize: "11px",
                fontWeight: 700,

                color: MUTED,

                letterSpacing:
                  "0.4px",

                whiteSpace: "nowrap",
              }}
            >
              PROJECT NAME
            </Typography>

            <Typography
              sx={{
                fontFamily: FONT,
                fontSize: "11px",
                fontWeight: 700,

                color: MUTED,

                letterSpacing:
                  "0.4px",

                whiteSpace: "nowrap",
              }}
            >
              DISEASE
            </Typography>

            <Typography
              sx={{
                fontFamily: FONT,
                fontSize: "11px",
                fontWeight: 700,

                color: MUTED,

                letterSpacing:
                  "0.4px",

                whiteSpace: "nowrap",
              }}
            >
              LAST MODULE
            </Typography>

            <Typography
              sx={{
                fontFamily: FONT,
                fontSize: "11px",
                fontWeight: 700,

                color: MUTED,

                letterSpacing:
                  "0.4px",

                whiteSpace: "nowrap",
              }}
            >
              STATUS
            </Typography>

            <Typography
              sx={{
                fontFamily: FONT,
                fontSize: "11px",
                fontWeight: 700,

                color: MUTED,

                letterSpacing:
                  "0.4px",

                whiteSpace: "nowrap",
              }}
            >
              LATEST ACTIVITY
            </Typography>

            {/* Action column spacer */}
            <Box />
          </Box>

          {/* ─────────────────────────────────────
              TABLE ROWS
          ───────────────────────────────────── */}

          <Box
            sx={{
              flex: 1,

              minHeight: 0,

              overflowY: "auto",

              overflowX: "auto",
            }}
          >
            {!loading && displayed.map((project, index) => (
              <Box
                key={project.id}
                onClick={() =>
                  navigate(
                    `/dashboard/active-projects/${project.id}`
                  )
                }
                sx={{
                  display: "grid",

                  /*
                    SAME grid as table header.
                    This fixes Disease / Last Module /
                    Status alignment.
                  */
                  gridTemplateColumns:
                    TABLE_GRID,

                  alignItems: "center",

                  px: "24px",
                  py: "16px",

                  minHeight: "74px",

                  borderBottom:
                    index === displayed.length - 1
                      ? "none"
                      : "1px solid #F0F2F5",

                  cursor: "pointer",

                  boxSizing: "border-box",
                  minWidth: TABLE_MIN_WIDTH,

                  "&:hover": {
                    bgcolor: BG,
                  },
                }}
              >
                {/* Project name */}
                <Typography
                  sx={{
                    fontFamily: FONT,
                    fontSize: "14px",
                    fontWeight: 600,

                    color: TITLE_COLOR,

                    minWidth: 0,

                    overflow: "hidden",
                    textOverflow:
                      "ellipsis",
                    whiteSpace:
                      "nowrap",
                  }}
                >
                  {project.name}
                </Typography>

                {/* Disease */}
                <Typography
                  sx={{
                    fontFamily: FONT,
                    fontSize: "14px",
                    fontWeight: 400,

                    color: "#475569",

                    minWidth: 0,

                    overflow: "hidden",
                    textOverflow:
                      "ellipsis",
                    whiteSpace:
                      "nowrap",
                  }}
                >
                  {project.disease || "—"}
                </Typography>

                {/* Last Module */}
                <Typography
                  sx={{
                    fontFamily: FONT,
                    fontSize: "14px",
                    fontWeight: 400,

                    color: "#475569",

                    minWidth: 0,

                    overflow: "hidden",
                    textOverflow:
                      "ellipsis",
                    whiteSpace:
                      "nowrap",
                  }}
                >
                  {project.module || "—"}
                </Typography>

                {/* Status */}
                <Box
                  sx={{
                    minWidth: 0,

                    display: "flex",
                    alignItems: "center",
                    justifyContent:
                      "flex-start",
                  }}
                >
                  <StatusChip
                    status={project.status}
                    onClick={(event) =>
                      handleStatusClick(
                        event,
                        project.id
                      )
                    }
                  />
                </Box>

                {/* Latest activity — updatedAt, UTC */}
                <Typography
                  sx={{
                    fontFamily: FONT,
                    fontSize: "13px",
                    fontWeight: 400,

                    color: "#475569",

                    whiteSpace: "nowrap",
                  }}
                >
                  {formatUtcDate(project.updatedAt)}
                </Typography>

                {/* Actions */}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent:
                      "flex-end",
                  }}
                >
                  <Box
                    component="button"
                    onClick={(event) =>
                      handleActionsClick(
                        event,
                        project.id
                      )
                    }
                    aria-label={`Actions for ${project.name}`}
                    sx={{
                      width: "28px",
                      height: "32px",

                      display: "flex",
                      alignItems: "center",
                      justifyContent:
                        "center",

                      border: "none",
                      bgcolor:
                        "transparent",

                      borderRadius: "4px",

                      cursor: "pointer",

                      p: 0,

                      "&:hover": {
                        bgcolor: "#F1F5F9",
                      },
                    }}
                  >
                    <MoreVertOutlined
                      sx={{
                        fontSize: 18,
                        color: MUTED,
                      }}
                    />
                  </Box>
                </Box>
              </Box>
            ))}

            {/* Empty state */}
            {loading ? (
              <Box
                sx={{
                  minHeight: "180px",

                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Typography
                  sx={{
                    fontFamily: FONT,
                    fontSize: "14px",
                    color: MUTED,
                  }}
                >
                  Loading projects...
                </Typography>
              </Box>
            ) : error ? (
              <Box
                role="alert"
                sx={{
                  minHeight: "180px",

                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                }}
              >
                <Typography
                  sx={{
                    fontFamily: FONT,
                    fontSize: "14px",
                    color: "#DC2626",
                  }}
                >
                  Couldn&apos;t load projects: {error}
                </Typography>
                <Button onClick={refetch} sx={{ textTransform: "none", fontFamily: FONT, color: TEAL }}>
                  Retry
                </Button>
              </Box>
            ) : (
              displayed.length === 0 && (
              <Box
                sx={{
                  minHeight: "180px",

                  display: "flex",
                  alignItems: "center",
                  justifyContent:
                    "center",
                }}
              >
                <Typography
                  sx={{
                    fontFamily: FONT,
                    fontSize: "14px",
                    color: MUTED,
                  }}
                >
                  No projects found
                </Typography>
              </Box>
              )
            )}
          </Box>
        </Box>

        {/* ───────────────────────────────────────
            PAGINATION
        ─────────────────────────────────────── */}

        <Box
          sx={{
            flexShrink: 0,

            width: "100%",

            display: "flex",
            alignItems: "center",
            justifyContent:
              "center",

            flexWrap: "wrap",

            gap: "8px",
          }}
        >
          <PageButton
            aria-label="Previous page"
            disabled={page === 1}
            onClick={() =>
              setPage((currentPage) =>
                Math.max(
                  1,
                  currentPage - 1
                )
              )
            }
          >
            <ChevronLeftOutlined
              sx={{ fontSize: 16 }}
            />
          </PageButton>

          {buildPageList(page, totalPages).map((item, index) =>
            item === "…" ? (
              <Box
                key={`gap-${index}`}
                sx={{
                  px: "4px",

                  color: "#6B7280",

                  fontFamily: FONT,
                  fontSize: "12px",
                }}
              >
                &hellip;
              </Box>
            ) : (
              <PageButton
                key={item}
                active={page === item}
                onClick={() => setPage(item)}
              >
                {item}
              </PageButton>
            )
          )}

          <PageButton
            aria-label="Next page"
            disabled={page >= totalPages}
            onClick={() =>
              setPage((currentPage) =>
                Math.min(totalPages, currentPage + 1)
              )
            }
          >
            <ChevronRightOutlined
              sx={{ fontSize: 16 }}
            />
          </PageButton>

          <Typography
            sx={{
              fontFamily: FONT,
              fontSize: "12px",
              fontWeight: 400,

              color: "#6B7280",

              whiteSpace: "nowrap",

              ml: "8px",
            }}
          >
            Showing {projects.length} of {totalCount} projects
            {totalPages > 1 ? ` · Page ${page} of ${totalPages}` : ""}
          </Typography>
        </Box>
      </Box>

      {/* ─────────────────────────────────────────
          STATUS DROPDOWN
      ───────────────────────────────────────── */}

      <StatusDropdown
        anchorEl={statusAnchorEl}
        open={Boolean(statusAnchorEl)}
        onClose={handleStatusClose}
        currentStatus={
          projects.find((p) => p.id === selectedProjectId)
            ?.status
        }
        onStatusChange={handleStatusChange}
      />

      {/* ─────────────────────────────────────────
          ACTIONS DROPDOWN
      ───────────────────────────────────────── */}

      <ActionsDropdown
        anchorEl={actionsAnchorEl}
        open={Boolean(actionsAnchorEl)}
        onClose={handleActionsClose}
        onAction={
          handleProjectAction
        }
      />

      {/* New Project Dialog */}
      <Dialog className="irenovo-modal" open={newProjectOpen} onClose={closeNewProject} fullWidth maxWidth="sm">
        <Box className="irenovo-modal-header">
          <Box className="irenovo-modal-icon">
            <AddOutlined sx={{ color: '#FFFFFF' }} />
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', ml: 1 }}>
            <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: 20 }}>New project</Typography>
            <Typography sx={{ color: MUTED, fontSize: 13 }}>Create a new project</Typography>
          </Box>

          <Box sx={{ flex: 1 }} />

          <Box component="button" onClick={closeNewProject} className="irenovo-modal-close">
            <CloseOutlined />
          </Box>
        </Box>

        <DialogContent>
          <Typography className="description">&nbsp;</Typography>

          <Box className="irenovo-form">
            <TextField
              label="Project Name"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              fullWidth
              variant="outlined"
            />

            <TextField
              label="Disease"
              value={newProjectDisease}
              onChange={(e) => setNewProjectDisease(e.target.value)}
              fullWidth
              variant="outlined"
              placeholder="e.g. Thrombocytosis"
            />

            {createError && (
              <Typography role="alert" sx={{ fontFamily: FONT, fontSize: 13, color: "#DC2626" }}>
                {createError}
              </Typography>
            )}
          </Box>
        </DialogContent>

        <DialogActions>
          <Button className="irenovo-create-cancel" onClick={closeNewProject}>Cancel</Button>
          <Button
            className="irenovo-create-save"
            onClick={handleCreateProject}
            disabled={createLoading || !newProjectDisease.trim()}
          >
            {createLoading ? "Creating..." : "Create & Save"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Rename Dialog — PATCH /projects/{id} { name } */}
      <Dialog
        className="irenovo-modal"
        open={Boolean(renameTarget)}
        onClose={() => !dialogBusy && setRenameTarget(null)}
        fullWidth
        maxWidth="sm"
      >
        <Box className="irenovo-modal-header">
          <Box sx={{ display: 'flex', flexDirection: 'column', ml: 1 }}>
            <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: 20 }}>Edit project</Typography>
            <Typography sx={{ color: MUTED, fontSize: 13 }}>Rename this project</Typography>
          </Box>

          <Box sx={{ flex: 1 }} />

          <Box component="button" onClick={() => !dialogBusy && setRenameTarget(null)} className="irenovo-modal-close">
            <CloseOutlined />
          </Box>
        </Box>

        <DialogContent>
          <Box className="irenovo-form">
            <TextField
              label="Project Name"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              fullWidth
              variant="outlined"
              autoFocus
            />
            {dialogError && (
              <Typography role="alert" sx={{ fontFamily: FONT, fontSize: 13, color: "#DC2626" }}>
                {dialogError}
              </Typography>
            )}
          </Box>
        </DialogContent>

        <DialogActions>
          <Button className="irenovo-create-cancel" onClick={() => setRenameTarget(null)} disabled={dialogBusy}>
            Cancel
          </Button>
          <Button
            className="irenovo-create-save"
            onClick={handleRename}
            disabled={dialogBusy || !renameValue.trim()}
          >
            {dialogBusy ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirm — DELETE /projects/{id} */}
      <Dialog
        className="irenovo-modal"
        open={Boolean(deleteTarget)}
        onClose={() => !dialogBusy && setDeleteTarget(null)}
        fullWidth
        maxWidth="xs"
      >
        <Box className="irenovo-modal-header">
          <Box sx={{ display: 'flex', flexDirection: 'column', ml: 1 }}>
            <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: 20 }}>Delete project?</Typography>
          </Box>
        </Box>

        <DialogContent>
          <Typography sx={{ fontFamily: FONT, fontSize: 14, color: TITLE_COLOR }}>
            &ldquo;{deleteTarget?.name}&rdquo; will be deleted. Its sessions are kept and unlinked.
          </Typography>
          {dialogError && (
            <Typography role="alert" sx={{ fontFamily: FONT, fontSize: 13, color: "#DC2626", mt: 1 }}>
              {dialogError}
            </Typography>
          )}
        </DialogContent>

        <DialogActions>
          <Button className="irenovo-create-cancel" onClick={() => setDeleteTarget(null)} disabled={dialogBusy}>
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            disabled={dialogBusy}
            sx={{ textTransform: "none", fontFamily: FONT, color: "#FFFFFF", bgcolor: "#EF4444", "&:hover": { bgcolor: "#DC2626" } }}
          >
            {dialogBusy ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProjectsPage;