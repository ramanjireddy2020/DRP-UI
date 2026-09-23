import React, { useRef, useState } from "react";
import { Box, Typography, Popover, TextField, CircularProgress } from "@mui/material";
import {
  SearchOutlined,
  UploadFileOutlined,
  FolderOpenOutlined,
  ChevronRightOutlined,
  HubOutlined,
  CloseOutlined,
  InsertDriveFileOutlined,
} from "@mui/icons-material";

const FONT      = "'Inter', sans-serif";
const TEAL      = "#0ABFBC";
const MUTED     = "#94A3B8";
const BORDER    = "#E2E8F0";
const TEXT_DARK = "#0F172A";
const BG        = "#F8FAFC";
const ERROR     = "#DC2626";

const DOT_COLORS = ["#F97316", TEAL, "#16A34A", "#D97706", "#6366F1"];

const menuRow = (active) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "10px",
  px: "14px",
  py: "10px",
  cursor: "pointer",
  bgcolor: active ? BG : "transparent",
  "&:hover": { bgcolor: BG },
});

const rowLabel = { fontFamily: FONT, fontSize: "13px", fontWeight: 500, color: TEXT_DARK };
const note = { fontFamily: FONT, fontSize: "12px", color: MUTED, px: "14px", py: "10px" };

/**
 * The composer's "+" menu: upload files, pick a project (GET /projects), pick
 * a module (GET /modules). All state lives in useComposer; this only renders.
 */
const ComposerAddPopover = ({ anchorEl, onClose, composer, onCreateProject }) => {
  const fileInputRef = useRef(null);
  const [submenu, setSubmenu] = useState(null); // "project" | "module" | null

  const close = () => {
    setSubmenu(null);
    composer.setProjectSearch("");
    onClose();
  };

  const toggle = (name) => setSubmenu((prev) => (prev === name ? null : name));

  const renderProjects = () => {
    if (composer.projectsLoading) {
      return (
        <Box sx={{ display: "flex", justifyContent: "center", py: "12px" }}>
          <CircularProgress size={16} sx={{ color: TEAL }} />
        </Box>
      );
    }
    if (composer.projectsError) {
      return <Typography sx={{ ...note, color: ERROR }}>{composer.projectsError}</Typography>;
    }
    if (!composer.projects.length) {
      return <Typography sx={note}>No projects found</Typography>;
    }
    return composer.projects.map((project, i) => (
      <Box
        key={project.id}
        onClick={() => {
          composer.selectProject(project);
          close();
        }}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          px: "14px",
          py: "8px",
          cursor: "pointer",
          bgcolor: composer.project?.id === project.id ? "#E6FAFA" : "transparent",
          "&:hover": { bgcolor: "#E6FAFA" },
        }}
      >
        <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: DOT_COLORS[i % DOT_COLORS.length], flexShrink: 0 }} />
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
    ));
  };

  const renderModules = () => {
    if (composer.modulesError) {
      return <Typography sx={{ ...note, color: ERROR }}>{composer.modulesError}</Typography>;
    }
    if (!composer.modules.length) {
      return <Typography sx={note}>No modules available</Typography>;
    }
    const options = [{ key: null, displayName: "Auto (let the assistant choose)" }, ...composer.modules];
    return options.map((m) => (
      <Box
        key={m.key || "auto"}
        onClick={() => {
          composer.setModule(m.key);
          close();
        }}
        title={m.description || ""}
        sx={{
          px: "14px",
          py: "8px",
          cursor: "pointer",
          bgcolor: (composer.module || null) === m.key ? "#E6FAFA" : "transparent",
          "&:hover": { bgcolor: "#E6FAFA" },
        }}
      >
        <Typography sx={{ fontFamily: FONT, fontSize: "12.5px", color: TEXT_DARK }}>
          {m.displayName || m.key}
        </Typography>
      </Box>
    ));
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        hidden
        onChange={(e) => {
          composer.addFiles(e.target.files);
          e.target.value = "";
        }}
      />

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={close}
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
              onClick={() => {
                fileInputRef.current?.click();
                close();
              }}
              sx={menuRow(false)}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <UploadFileOutlined sx={{ fontSize: 16, color: MUTED, flexShrink: 0 }} />
                <Typography sx={rowLabel}>Upload files or data</Typography>
              </Box>
            </Box>

            <Box onClick={() => toggle("project")} sx={menuRow(submenu === "project")}>
              <Box sx={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <FolderOpenOutlined sx={{ fontSize: 16, color: MUTED, flexShrink: 0 }} />
                <Typography sx={rowLabel}>Add to project</Typography>
              </Box>
              <ChevronRightOutlined sx={{ fontSize: 15, color: MUTED }} />
            </Box>

            <Box onClick={() => toggle("module")} sx={menuRow(submenu === "module")}>
              <Box sx={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <HubOutlined sx={{ fontSize: 16, color: MUTED, flexShrink: 0 }} />
                <Typography sx={rowLabel}>Choose module</Typography>
              </Box>
              <ChevronRightOutlined sx={{ fontSize: 15, color: MUTED }} />
            </Box>
          </Box>

          {submenu === "project" && (
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
                sx={{ fontFamily: FONT, fontSize: "11px", fontWeight: 700, color: MUTED, textTransform: "uppercase", px: "14px", mb: "8px" }}
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
                  value={composer.projectSearch}
                  onChange={(e) => composer.setProjectSearch(e.target.value)}
                  fullWidth
                  InputProps={{ disableUnderline: true }}
                  sx={{
                    "& input": { fontFamily: FONT, fontSize: "12px", color: TEXT_DARK, py: 0 },
                    "& input::placeholder": { color: MUTED, opacity: 1 },
                  }}
                />
              </Box>

              <Box sx={{ flex: 1, overflowY: "auto", minHeight: 0 }}>{renderProjects()}</Box>

              <Box
                onClick={() => {
                  close();
                  onCreateProject();
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

          {submenu === "module" && (
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
                sx={{ fontFamily: FONT, fontSize: "11px", fontWeight: 700, color: MUTED, textTransform: "uppercase", px: "14px", mb: "8px" }}
              >
                Select Module
              </Typography>
              <Box sx={{ flex: 1, overflowY: "auto", minHeight: 0 }}>{renderModules()}</Box>
            </Box>
          )}
        </Box>
      </Popover>
    </>
  );
};

/* Small removable chip used in the composer toolbar. */
const Chip = ({ icon, label, onRemove, title }) => (
  <Box
    title={title || label}
    sx={{
      display: "inline-flex",
      alignItems: "center",
      gap: "4px",
      height: "24px",
      px: "8px",
      maxWidth: "170px",
      flexShrink: 0,
      bgcolor: "#E6FAFA",
      borderRadius: "6px",
    }}
  >
    {icon}
    <Typography
      sx={{
        fontFamily: FONT,
        fontSize: "11.5px",
        fontWeight: 500,
        color: TEXT_DARK,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
    >
      {label}
    </Typography>
    {onRemove && (
      <CloseOutlined
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        aria-label={`Remove ${label}`}
        sx={{ fontSize: 12, color: MUTED, cursor: "pointer", flexShrink: 0, "&:hover": { color: TEXT_DARK } }}
      />
    )}
  </Box>
);

/**
 * Chips for what is attached to the composer (project, module, files) plus
 * upload/draft status. Rendered next to the "+" button.
 */
export const ComposerAttachments = ({ composer }) => {
  const moduleName =
    composer.module &&
    (composer.modules.find((m) => m.key === composer.module)?.displayName || composer.module);
  const status = composer.uploadError || composer.draftError;

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0, overflowX: "auto", "&::-webkit-scrollbar": { display: "none" } }}>
      {composer.project && (
        <Chip
          icon={<FolderOpenOutlined sx={{ fontSize: 12, color: TEAL }} />}
          label={composer.project.name}
          onRemove={composer.clearProject}
        />
      )}
      {moduleName && (
        <Chip
          icon={<HubOutlined sx={{ fontSize: 12, color: TEAL }} />}
          label={moduleName}
          onRemove={() => composer.setModule(null)}
        />
      )}
      {composer.files.map((f) => (
        <Chip
          key={f.fileId}
          icon={<InsertDriveFileOutlined sx={{ fontSize: 12, color: TEAL }} />}
          label={f.fileName}
          onRemove={() => composer.removeFile(f.fileId)}
        />
      ))}
      {composer.uploading && <CircularProgress size={14} sx={{ color: TEAL, flexShrink: 0 }} />}
      {status && (
        <Typography
          title={status}
          sx={{ fontFamily: FONT, fontSize: "11px", color: ERROR, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "200px" }}
        >
          {status}
        </Typography>
      )}
    </Box>
  );
};

export default ComposerAddPopover;
