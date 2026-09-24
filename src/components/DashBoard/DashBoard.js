import React, { useState } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  Box, Typography, IconButton, Drawer, useMediaQuery, useTheme,
} from "@mui/material";
import {
  AddOutlined, HomeOutlined, HistoryOutlined, FolderOutlined,
  SettingsOutlined, LogoutOutlined,
  AccountTreeOutlined, FindInPageOutlined, StorageOutlined,
  MenuOutlined, NotificationsNoneOutlined,
} from "@mui/icons-material";
import NewProjectModal from "../NewProjectModal";
import { useCurrentUser } from "../../context/CurrentUserContext";

// Design tokens (Figma: sidebar #1A2332, 240px, 20px padding)
const SIDEBAR_BG = "#1A2332";
const HOVER_BG   = "#243447";
const ACTIVE_BG  = "#243447";
const MUTED      = "#94A3B8";
const TEAL       = "#0ABFBC";
const FONT       = "'Inter', sans-serif";
const SIDEBAR_W  = 240;
const COLLAPSED_W = 68;

const MODULE_PATHS = [
  "/dashboard/TxKG-knowledge-graph",
  "/dashboard/literature-mining",
  "/dashboard/data-curation-engine",
  "/dashboard/screening-suite",
  "/dashboard/novelty-search-agent",
];

const moduleSubNav = [
  { label: "TxKG",     icon: AccountTreeOutlined, path: "/dashboard/TxKG-knowledge-graph" },
  { label: "LitMineX", icon: FindInPageOutlined,  path: "/dashboard/literature-mining"    },
  { label: "CurateX",  icon: StorageOutlined,     path: "/dashboard/data-curation-engine"  },
];

// Single nav link item
const NavItem = ({ to, icon: Icon, label, end = false, collapsed }) => (
  <NavLink to={to} end={end} style={{ textDecoration: "none" }}>
    {({ isActive }) => (
      <Box sx={{
        display: "flex", alignItems: "center", gap: "12px",
        px: "12px", py: "10px", borderRadius: "8px",
        bgcolor: isActive ? ACTIVE_BG : "transparent",
        cursor: "pointer", transition: "background 0.15s",
        justifyContent: collapsed ? "center" : "flex-start",
        "&:hover": { bgcolor: ACTIVE_BG },
      }}>
        <Icon sx={{ fontSize: 18, color: isActive ? TEAL : MUTED, flexShrink: 0 }} />
        {!collapsed && (
          <Typography sx={{
            fontFamily: FONT, fontSize: "14px",
            fontWeight: isActive ? 500 : 400,
            color: isActive ? "#F1F5F9" : MUTED,
          }}>
            {label}
          </Typography>
        )}
      </Box>
    )}
  </NavLink>
);

// Sidebar inner content (shared between permanent and Drawer)
const SidebarInner = ({ collapsed, onToggle, onNewResearch, navigate }) => {
  // Review point 6: was a hardcoded "Dr. Priya / Chief Researcher" card.
  const { displayName, role } = useCurrentUser();
  const location = useLocation();
  const onModulePage = MODULE_PATHS.some((p) => location.pathname.startsWith(p));

  return (
    <Box sx={{
      height: "100%", bgcolor: SIDEBAR_BG,
      display: "flex", flexDirection: "column",
      justifyContent: "space-between", p: "20px",
      overflowY: "auto", boxSizing: "border-box",
      "&::-webkit-scrollbar": { width: "4px" },
      "&::-webkit-scrollbar-thumb": { bgcolor: ACTIVE_BG, borderRadius: "4px" },
    }}>
      {/* Top */}
      <Box>
        {/* Logo + collapse toggle */}
        <Box sx={{
          display: "flex", alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          mb: "32px",
        }}>
          {!collapsed && (
            <Box sx={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Box component="img" src="/logo.png" alt="Drug Repurposing Platform"
                sx={{ width: 32, height: 32, objectFit: "cover", borderRadius: "50%", flexShrink: 0 }} />
              <Typography sx={{ color: "#fff", fontWeight: 700, fontSize: "20px", fontFamily: FONT, letterSpacing: "-0.05em" }}>DRP</Typography>
            </Box>
          )}
          <IconButton
            size="small"
            onClick={onToggle}
            sx={{ color: MUTED, "&:hover": { color: "#fff", bgcolor: HOVER_BG } }}
          >
            <MenuOutlined sx={{ fontSize: 20 }} />
          </IconButton>
        </Box>

        {/* Nav items */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          {/* New Research - navigate to /dashboard/new-research */}
          <NavLink to="/dashboard/new-research" style={{ textDecoration: "none" }}>
            {({ isActive }) => (
              <Box
                sx={{
                  display: "flex", alignItems: "center", gap: "12px",
                  px: "12px", py: "10px", borderRadius: "8px",
                  cursor: "pointer", justifyContent: collapsed ? "center" : "flex-start",
                  bgcolor: isActive ? ACTIVE_BG : "transparent",
                  "&:hover": { bgcolor: ACTIVE_BG },
                }}
              >
                <AddOutlined sx={{ fontSize: 18, color: isActive ? TEAL : MUTED, flexShrink: 0 }} />
                {!collapsed && (
                  <Typography sx={{ fontFamily: FONT, fontSize: "14px", fontWeight: isActive ? 500 : 400, color: isActive ? "#F1F5F9" : MUTED }}>New Research</Typography>
                )}
              </Box>
            )}
          </NavLink>

          <NavItem to="/dashboard" icon={HomeOutlined} label="Home" end collapsed={collapsed} />
          <NavItem to="/dashboard/recent-sessions" icon={HistoryOutlined} label="Recent Sessions" collapsed={collapsed} />
          <NavItem to="/dashboard/active-projects" icon={FolderOutlined} label="Projects" collapsed={collapsed} />

          {/* Module sub-nav shown only when on a module page and not collapsed */}
          {onModulePage && !collapsed && (
            <Box sx={{ ml: "8px", mt: "4px", display: "flex", flexDirection: "column", gap: "2px" }}>
              {moduleSubNav.map(({ label, icon: Icon, path }) => (
                <NavLink key={path} to={path} style={{ textDecoration: "none" }}>
                  {({ isActive }) => (
                    <Box sx={{
                      display: "flex", alignItems: "center", gap: "10px",
                      px: "12px", py: "8px", borderRadius: "8px", cursor: "pointer",
                      bgcolor: isActive ? ACTIVE_BG : "transparent",
                      "&:hover": { bgcolor: ACTIVE_BG },
                    }}>
                      <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: isActive ? TEAL : MUTED, flexShrink: 0 }} />
                      <Typography sx={{
                        fontFamily: FONT, fontSize: "13px",
                        fontWeight: isActive ? 500 : 400,
                        color: isActive ? "#F1F5F9" : MUTED,
                      }}>
                        {label}
                      </Typography>
                    </Box>
                  )}
                </NavLink>
              ))}
            </Box>
          )}
        </Box>
      </Box>

      {/* Bottom */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        <Box sx={{
          display: "flex", alignItems: "center", gap: "12px",
          px: "12px", py: "10px", borderRadius: "8px", cursor: "pointer",
          justifyContent: collapsed ? "center" : "flex-start",
          "&:hover": { bgcolor: HOVER_BG },
        }}>
          <SettingsOutlined sx={{ fontSize: 18, color: MUTED }} />
          {!collapsed && <Typography sx={{ fontFamily: FONT, fontSize: "14px", color: MUTED }}>Settings</Typography>}
        </Box>

        <Box
          onClick={() => navigate("/")}
          sx={{
            display: "flex", alignItems: "center", gap: "12px",
            px: "12px", py: "10px", borderRadius: "8px", cursor: "pointer",
            justifyContent: collapsed ? "center" : "flex-start",
            "&:hover": { bgcolor: HOVER_BG },
          }}
        >
          <LogoutOutlined sx={{ fontSize: 18, color: MUTED }} />
          {!collapsed && <Typography sx={{ fontFamily: FONT, fontSize: "14px", color: MUTED }}>Sign Out</Typography>}
        </Box>

        {/* User profile */}
        <Box sx={{
          display: "flex", alignItems: "center",
          gap: collapsed ? 0 : "10px",
          px: "12px", py: "10px", mt: "4px",
          borderTop: "1px solid #243447", pt: "14px",
          justifyContent: collapsed ? "center" : "flex-start",
        }}>
          <Box
            component="img"
            src="/authbtn.png"
            alt="User"
            sx={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
          />
          {!collapsed && (
            <Box>
              <Typography sx={{ fontFamily: FONT, fontSize: "13px", fontWeight: 600, color: "#F1F5F9", lineHeight: 1.3 }}>
                {displayName}
              </Typography>
              {role && (
                <Typography sx={{ fontFamily: FONT, fontSize: "11px", color: MUTED, lineHeight: 1.3 }}>
                  {role}
                </Typography>
              )}
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

// Dashboard shell
const Dashboard = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const handleNewResearch = () => {
    setModalOpen(true);
    setMobileOpen(false);
  };

  const sidebarProps = {
    onNewResearch: handleNewResearch,
    navigate,
  };

  return (
    <Box sx={{ display: "flex", height: "100vh", width: "100vw", overflow: "hidden", fontFamily: FONT }}>

      {/* Mobile: hamburger button + Drawer overlay */}
      {isMobile ? (
        <>
          <IconButton
            onClick={() => setMobileOpen(true)}
            sx={{
              position: "fixed", top: 12, left: 12, zIndex: 1300,
              color: "#fff", bgcolor: SIDEBAR_BG,
              "&:hover": { bgcolor: HOVER_BG },
            }}
          >
            <MenuOutlined />
          </IconButton>
          <Drawer
            open={mobileOpen}
            onClose={() => setMobileOpen(false)}
            PaperProps={{ sx: { width: SIDEBAR_W, bgcolor: SIDEBAR_BG, border: "none" } }}
          >
            <SidebarInner
              {...sidebarProps}
              collapsed={false}
              onToggle={() => setMobileOpen(false)}
            />
          </Drawer>
        </>
      ) : (
        /* Desktop: permanent collapsible sidebar */
        <Box sx={{
          width: collapsed ? `${COLLAPSED_W}px` : `${SIDEBAR_W}px`,
          flexShrink: 0, height: "100vh",
          transition: "width 0.2s ease",
          overflow: "hidden",
        }}>
          <SidebarInner
            {...sidebarProps}
            collapsed={collapsed}
            onToggle={() => setCollapsed((c) => !c)}
          />
        </Box>
      )}

      {/* Main content */}
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", bgcolor: "#F8FAFC", overflow: "hidden", pt: isMobile ? "56px" : 0 }}>
        {/* top-nav: Figma — Fill 1200px × 72px Hug, horizontal, space-between, py:16 px:32, border-bottom:1px, bg:#FFFFFF */}
        <Box sx={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          height: "72px", flexShrink: 0,
          bgcolor: "#fff", borderBottom: "1px solid #E2E8F0",
          px: "32px",
        }}>
          <Box />
          <IconButton size="small" sx={{ color: MUTED }}>
            <NotificationsNoneOutlined sx={{ fontSize: 22 }} />
          </IconButton>
        </Box>
        {/* Scrollable page content */}
        <Box sx={{ flex: 1, overflowY: "auto" }}>
          <Outlet context={{ openNewResearch: handleNewResearch }} />
        </Box>
      </Box>

      <NewProjectModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </Box>
  );
};

export default Dashboard;