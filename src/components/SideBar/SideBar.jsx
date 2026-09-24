import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { signOut } from "@aws-amplify/auth";
import {
  Box,
  Typography,
  IconButton,
  useMediaQuery,
} from "@mui/material";

import {
  AddOutlined,
  HomeOutlined,
  HistoryOutlined,
  FolderOutlined,
  MenuOpenOutlined,
  MenuOutlined,
} from "@mui/icons-material";

import { useCurrentUser } from "../../context/CurrentUserContext";

/* =========================================================
   DESIGN TOKENS
   ========================================================= */

const SIDEBAR_BG = "#0E1521";
const HOVER_BG = "#1E2936";
const BORDER = "#2A3547";
const ICON_MUTED = "#8C9EB2";
const LABEL_COLOR = "#B8C7D6";
const COLLAPSE_ICON = "#BFC7D1";
const CTA_LABEL = "#0F1724";
const TEAL = "#00C2B5";
const TEXT = "#F1F5F9";
const FONT = "'Inter', sans-serif";

/* =========================================================
   LOGO
   =========================================================
   Complete Drug Repurposing Platform logo asset.
   Kept inline so there are no external asset dependencies.
   ========================================================= */

const LOGO_URL =
  "data:image/png;base64,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";

const SIDEBAR_W_FULL = 240;
const SIDEBAR_W_RAIL = 64;

/* =========================================================
   BRAND MARK
   ========================================================= */

const BrandMark = ({
  size = 32,
  collapsed = false,
  onClick,
}) => (
  <Box
    onClick={onClick}
    sx={{
      width: size,
      height: size,
      flexShrink: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: collapsed ? "pointer" : "default",
      borderRadius: "50%",
      transition: "transform 0.15s ease",

      ...(collapsed && {
        "&:hover": {
          transform: "scale(1.05)",
        },
      }),
    }}
  >
    <img
      src={LOGO_URL}
      alt="Drug Repurposing Platform"
      width={size}
      height={size}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        flexShrink: 0,
        display: "block",
        borderRadius: "50%",
      }}
    />
  </Box>
);

/* =========================================================
   NAV ITEM
   ========================================================= */

function NavItem({
  icon: Icon,
  label,
  onClick,
  active,
  collapsed,
}) {
  return (
    <Box
      onClick={onClick}
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: collapsed ? "center" : "flex-start",
        gap: "12px",
        width: "100%",
        minHeight: "38px",
        borderRadius: "8px",
        padding: collapsed ? "10px 0" : "10px 12px",
        cursor: "pointer",
        boxSizing: "border-box",
        background: active ? HOVER_BG : "transparent",
        transition: "background 0.15s ease",

        "&:hover": {
          background: HOVER_BG,
        },
      }}
    >
      <Icon
        sx={{
          fontSize: 18,
          color: active ? TEXT : ICON_MUTED,
          flexShrink: 0,
        }}
      />

      {!collapsed && (
        <Typography
          sx={{
            fontFamily: FONT,
            fontSize: "14px",
            fontWeight: 500,
            lineHeight: 1,
            color: active ? TEXT : LABEL_COLOR,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {label}
        </Typography>
      )}
    </Box>
  );
}

/* =========================================================
   SIDEBAR
   ========================================================= */

/* Sign out of Cognito when the host layout does not supply its own handler
   (CompleteWorkflow and WorkflowLayout render <SideBar /> bare), so "Log out"
   never just navigates to /login while leaving the session alive. */
const defaultLogout = () => signOut();

const SideBar = ({
  onNewResearch,
  onLogout = defaultLogout,
  user,
  activePath: activePathProp,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Nav highlighting follows the current route unless a layout overrides it.
  const activePath = (activePathProp ?? location.pathname).replace(/\/+$/, "") || "/";

  // Review point 6: the footer card showed "DR. Priya" for every account.
  // It now reads the signed-in researcher from GET /users/me, falling back to
  // the neutral "Researcher" the context supplies while the profile loads.
  const currentUser = useCurrentUser();

  const sidebarUser = user || {
    name: currentUser.displayName,
    email: currentUser.email || "",
    role: currentUser.role || "",
    initials: currentUser.initials,
    avatarUrl: currentUser.avatarUrl || "",
  };

  // avatarUrl is "" for most accounts; a URL that fails to load also falls
  // back to the initials.
  const [avatarFailed, setAvatarFailed] = useState(false);

  useEffect(() => {
    setAvatarFailed(false);
  }, [sidebarUser.avatarUrl]);

  const showAvatarImage = Boolean(sidebarUser.avatarUrl) && !avatarFailed;

  /* =======================================================
     RESPONSIVE BREAKPOINTS

     Desktop >= 1200
       Full sidebar

     Tablet 900 - 1199
       Collapsed rail

     Mobile < 900
       Off-canvas drawer
     ======================================================= */

  const isTablet = useMediaQuery("(max-width:1199px)");
  const isMobile = useMediaQuery("(max-width:899px)");

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  /* =======================================================
     RESPONSIVE SIDEBAR STATE
     ======================================================= */

  useEffect(() => {
    if (isTablet && !isMobile) {
      setCollapsed(true);
    } else if (!isTablet) {
      setCollapsed(false);
    }
  }, [isTablet, isMobile]);

  /* Close mobile drawer when leaving mobile */
  useEffect(() => {
    if (!isMobile) {
      setMobileOpen(false);
    }
  }, [isMobile]);

  /* =======================================================
     NAVIGATION
     ======================================================= */

  const handleNewResearch = () => {
    setMobileOpen(false);

    if (onNewResearch) {
      onNewResearch();
    } else {
      navigate("/dashboard/new-research");
    }
  };

  const handleNavClick = (path) => {
    setMobileOpen(false);

    /*
      If sidebar is collapsed and user clicks any navigation
      item, expand the sidebar.
    */
    if (collapsed && !isMobile) {
      setCollapsed(false);
    }

    navigate(path);
  };

  const handleLogout = async () => {
    await onLogout();
    navigate("/login");
  };

  /* =======================================================
     EFFECTIVE STATE
     ======================================================= */

  const effectiveCollapsed = isMobile ? false : collapsed;

  const sidebarWidth = effectiveCollapsed
    ? SIDEBAR_W_RAIL
    : SIDEBAR_W_FULL;

  /* =======================================================
     SIDEBAR CONTENT
     ======================================================= */

  const sidebarContent = (
    <Box
      sx={{
        width: `${sidebarWidth}px`,
        height: "100%",
        bgcolor: SIDEBAR_BG,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",

        padding: effectiveCollapsed
          ? "24px 12px 20px"
          : "24px 20px 20px",

        boxSizing: "border-box",
        fontFamily: FONT,
        borderRight: `1px solid ${BORDER}`,

        transition:
          "width 0.25s ease, padding 0.25s ease",

        flexShrink: 0,
        overflow: "hidden",
      }}
    >
      {/* ===================================================
          TOP SECTION
          =================================================== */}

      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: "32px",
          width: "100%",
        }}
      >
        {/* =================================================
            BRAND ROW
            ================================================= */}

        <Box
          sx={{
            display: "flex",
            alignItems: "center",

            justifyContent: effectiveCollapsed
              ? "center"
              : "space-between",

            width: "100%",
            minHeight: "32px",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              minWidth: 0,
            }}
          >
            {/* 
              IMPORTANT:
              When collapsed, clicking the logo expands
              the sidebar.
            */}
            <BrandMark
              size={32}
              collapsed={effectiveCollapsed}
              onClick={() => {
                if (effectiveCollapsed && !isMobile) {
                  setCollapsed(false);
                }
              }}
            />

            {!effectiveCollapsed && (
              <Typography
                sx={{
                  fontFamily: FONT,
                  fontSize: "18px",
                  fontWeight: 700,
                  lineHeight: 1,
                  letterSpacing: "-0.005em",
                  color: "#FFFFFF",
                  whiteSpace: "nowrap",
                }}
              >
                {/* Short form: the full "Drug Repurposing Platform" doesn't
                    fit beside the logo in the 240px rail. */}
                DRP
              </Typography>
            )}
          </Box>

          {/* =================================================
              COLLAPSE BUTTON

              Visible ONLY when sidebar is expanded.

              There is intentionally NO separate expand
              button when collapsed.

              Logo is the expand control.
              ================================================= */}

          {!effectiveCollapsed && !isMobile && (
            <IconButton
              onClick={() => setCollapsed(true)}
              size="small"
              aria-label="Collapse sidebar"
              sx={{
                width: 24,
                height: 24,
                color: COLLAPSE_ICON,

                "&:hover": {
                  bgcolor: HOVER_BG,
                },
              }}
            >
              <MenuOpenOutlined
                sx={{
                  fontSize: 20,
                }}
              />
            </IconButton>
          )}

          {/* =================================================
              MOBILE CLOSE BUTTON
              ================================================= */}

          {isMobile && (
            <IconButton
              onClick={() => setMobileOpen(false)}
              size="small"
              aria-label="Close menu"
              sx={{
                width: 24,
                height: 24,
                color: COLLAPSE_ICON,

                "&:hover": {
                  bgcolor: HOVER_BG,
                },
              }}
            >
              <MenuOpenOutlined
                sx={{
                  fontSize: 20,
                }}
              />
            </IconButton>
          )}
        </Box>

        {/* =================================================
            NEW RESEARCH BUTTON
            ================================================= */}

        <Box
          onClick={handleNewResearch}
          sx={{
            display: "flex",
            alignItems: "center",

            justifyContent: effectiveCollapsed
              ? "center"
              : "flex-start",

            gap: "10px",
            width: "100%",
            minHeight: "38px",
            borderRadius: "10px",

            cursor: "pointer",

            background:
              "linear-gradient(90deg, #00B9D3 0%, #00BB83 100%)",

            padding: effectiveCollapsed
              ? "10px 0"
              : "10px 16px",

            boxSizing: "border-box",

            "&:hover": {
              filter: "brightness(1.06)",
            },
          }}
        >
          <AddOutlined
            sx={{
              fontSize: 16,
              color: CTA_LABEL,
              flexShrink: 0,
            }}
          />

          {!effectiveCollapsed && (
            <Typography
              sx={{
                fontFamily: FONT,
                fontSize: "14px",
                fontWeight: 600,
                lineHeight: 1,
                color: CTA_LABEL,
                whiteSpace: "nowrap",
              }}
            >
              New Research
            </Typography>
          )}
        </Box>

        {/* =================================================
            NAVIGATION
            ================================================= */}

        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: "6px",
            width: "100%",
          }}
        >
          <NavItem
            icon={HomeOutlined}
            label="Home"
            collapsed={effectiveCollapsed}
            active={activePath === "/dashboard"}
            onClick={() =>
              handleNavClick("/dashboard")
            }
          />

          <NavItem
            icon={HistoryOutlined}
            label="Recent Sessions"
            collapsed={effectiveCollapsed}
            active={
              activePath ===
              "/dashboard/recent-sessions"
            }
            onClick={() =>
              handleNavClick(
                "/dashboard/recent-sessions"
              )
            }
          />

          <NavItem
            icon={FolderOutlined}
            label="Projects"
            collapsed={effectiveCollapsed}
            active={activePath.startsWith(
              "/dashboard/active-projects"
            )}
            onClick={() =>
              handleNavClick(
                "/dashboard/active-projects"
              )
            }
          />
        </Box>
      </Box>

      {/* ===================================================
          USER PROFILE
          =================================================== */}

      <Box
        sx={{
          display: "flex",
          alignItems: "center",

          justifyContent: effectiveCollapsed
            ? "center"
            : "flex-start",

          flexDirection: effectiveCollapsed
            ? "column"
            : "row",

          gap: effectiveCollapsed
            ? "8px"
            : "10px",

          pt: "12px",

          borderTop: `1px solid ${BORDER}`,
        }}
      >
        {/* Avatar */}
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            flexShrink: 0,

            bgcolor: TEAL,

            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          {showAvatarImage ? (
            <img
              src={sidebarUser.avatarUrl}
              alt={sidebarUser.name}
              onError={() => setAvatarFailed(true)}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          ) : (
            <Typography
              sx={{
                fontFamily: FONT,
                fontSize: "13px",
                fontWeight: 700,
                color: SIDEBAR_BG,
              }}
            >
              {sidebarUser.initials}
            </Typography>
          )}
        </Box>

        {!effectiveCollapsed && (
          <>
            {/* User details */}
            <Box
              sx={{
                flex: 1,
                minWidth: 0,
              }}
            >
              <Typography
                sx={{
                  fontFamily: FONT,
                  fontSize: "14px",
                  fontWeight: 600,
                  color: TEXT,
                  lineHeight: 1.3,
                }}
              >
                {sidebarUser.name}
              </Typography>

              {sidebarUser.role && (
                <Typography
                  sx={{
                    fontFamily: FONT,
                    fontSize: "12px",
                    color: LABEL_COLOR,
                    lineHeight: 1.3,

                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {sidebarUser.role}
                </Typography>
              )}

              <Typography
                sx={{
                  fontFamily: FONT,
                  fontSize: "12px",
                  color: ICON_MUTED,
                  lineHeight: 1.3,

                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {sidebarUser.email}
              </Typography>
            </Box>

            {/* Logout */}
            <Typography
              onClick={handleLogout}
              sx={{
                fontFamily: FONT,
                fontSize: "13px",
                fontWeight: 500,
                color: ICON_MUTED,
                cursor: "pointer",
                flexShrink: 0,

                "&:hover": {
                  color: TEXT,
                },
              }}
            >
              Log out
            </Typography>
          </>
        )}
      </Box>
    </Box>
  );

  /* =========================================================
     MOBILE SIDEBAR
     ========================================================= */

  if (isMobile) {
    return (
      <>
        {/* Mobile menu trigger */}
        {!mobileOpen && (
          <IconButton
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            sx={{
              position: "fixed",
              top: 16,
              left: 16,
              zIndex: 1300,

              width: 40,
              height: 40,

              bgcolor: SIDEBAR_BG,
              color: TEXT,

              border: `1px solid ${BORDER}`,

              "&:hover": {
                bgcolor: HOVER_BG,
              },
            }}
          >
            <MenuOutlined
              sx={{
                fontSize: 20,
              }}
            />
          </IconButton>
        )}

        {/* Backdrop */}
        {mobileOpen && (
          <Box
            onClick={() => setMobileOpen(false)}
            sx={{
              position: "fixed",
              inset: 0,

              bgcolor: "rgba(0,0,0,0.45)",

              zIndex: 1200,
            }}
          />
        )}

        {/* Drawer */}
        <Box
          sx={{
            position: "fixed",

            top: 0,
            left: 0,
            bottom: 0,

            zIndex: 1250,

            transform: mobileOpen
              ? "translateX(0)"
              : "translateX(-100%)",

            transition:
              "transform 0.25s ease",

            boxShadow: mobileOpen
              ? "4px 0 24px rgba(0,0,0,0.35)"
              : "none",
          }}
        >
          {sidebarContent}
        </Box>
      </>
    );
  }

  /* =========================================================
     TABLET / DESKTOP
     ========================================================= */

  return sidebarContent;
};

export default SideBar;