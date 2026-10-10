import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useEffect, useMemo, useState } from "react";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import {
  AppBar,
  Avatar,
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/SpaceDashboardOutlined";
import LeadsIcon from "@mui/icons-material/GroupsOutlined";
import UsersIcon from "@mui/icons-material/BadgeOutlined";
import LogoutIcon from "@mui/icons-material/LogoutOutlined";
import MenuIcon from "@mui/icons-material/MenuOutlined";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeftOutlined";

import NotificationBell from "./NotificationBell";
import { loggedOut, selectCurrentUser } from "../../features/auth/authSlice";
import usePermission from "../../hooks/usePermission";
import { PERMISSIONS } from "../../config/permissions";

const DRAWER_WIDTH = 240;
const COMPACT_DRAWER_WIDTH = 76;
const MOBILE_DRAWER_WIDTH = 280;

const NAV_ITEMS = [
  {
    to: "/dashboard",
    label: "Dashboard",
    icon: <DashboardIcon />,
  },
  {
    to: "/leads",
    label: "Leads",
    icon: <LeadsIcon />,
  },
];

const PAGE_TITLES = {
  "/dashboard": "Dashboard",
  "/leads": "Leads",
  "/users": "Users",
};

function getPageTitle(pathname) {
  if (pathname.startsWith("/leads/")) {
    return "Lead Details";
  }

  return PAGE_TITLES[pathname] || "LeadFlow";
}

export default function AppLayout() {
  const user = useSelector(selectCurrentUser);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();

  /*
   * Responsive layout:
   *
   * < 900px  = mobile temporary drawer
   * 900-1199 = compact permanent drawer
   * >= 1200  = full permanent drawer
   */
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const isCompact = useMediaQuery(theme.breakpoints.between("md", "lg"));

  const canManageUsers = usePermission(PERMISSIONS.USER_MANAGE);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState(null);

  const navItems = useMemo(
    () =>
      canManageUsers
        ? [
            ...NAV_ITEMS,
            {
              to: "/users",
              label: "Users",
              icon: <UsersIcon />,
            },
          ]
        : NAV_ITEMS,
    [canManageUsers]
  );

  const pageTitle = getPageTitle(location.pathname);

  const drawerWidth = isMobile
    ? MOBILE_DRAWER_WIDTH
    : isCompact
      ? COMPACT_DRAWER_WIDTH
      : DRAWER_WIDTH;

  /*
   * Automatically close the mobile navigation after route changes.
   */
  useEffect(() => {
    if (isMobile) {
      setMobileOpen(false);
    }
  }, [location.pathname, isMobile]);

  const handleLogout = () => {
    setMenuAnchor(null);
    dispatch(loggedOut());
    navigate("/login");
  };

  const handleNavClick = () => {
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const initials = user?.fullName
    ?.split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  /*
   * Shared drawer contents.
   * The same navigation is used by mobile, tablet and desktop.
   */
  const drawerContent = (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      <Toolbar
        sx={{
          px: isMobile ? 2.5 : isCompact ? 1.5 : 2.5,
          minHeight: "64px !important",
          justifyContent: isCompact ? "center" : "space-between",
        }}
      >
        {isCompact ? (
          <Typography
            variant="h6"
            sx={{
              fontWeight: 800,
              color: "primary.light",
            }}
          >
            L
          </Typography>
        ) : (
          <Box>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 800,
                letterSpacing: -0.3,
              }}
            >
              LeadFlow
            </Typography>

            <Typography
              variant="caption"
              sx={{
                color: "rgba(255,255,255,0.58)",
              }}
            >
              Lead management
            </Typography>
          </Box>
        )}

        {isMobile && (
          <IconButton
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
            sx={{ color: "inherit" }}
          >
            <ChevronLeftIcon />
          </IconButton>
        )}
      </Toolbar>

      <Divider
        sx={{
          borderColor: "rgba(255,255,255,0.08)",
        }}
      />

      <List
        sx={{
          px: isCompact ? 1 : 1.5,
          py: 2,
        }}
      >
        {navItems.map((item) => {
          const button = (
            <ListItemButton
              key={item.to}
              component={NavLink}
              to={item.to}
              onClick={handleNavClick}
              sx={{
                minHeight: 46,
                justifyContent: isCompact
                  ? "center"
                  : "flex-start",
                px: isCompact ? 1 : 1.5,
                borderRadius: 2,
                mb: 0.5,
                color: "rgba(255,255,255,0.72)",
                transition:
                  "background-color 160ms ease, color 160ms ease",

                "&.active": {
                  color: "#fff",
                  bgcolor: "rgba(255,255,255,0.13)",

                  "& .MuiListItemIcon-root": {
                    color: "primary.light",
                  },
                },

                "&:hover": {
                  color: "#fff",
                  bgcolor: "rgba(255,255,255,0.08)",
                },
              }}
            >
              <ListItemIcon
                sx={{
                  color: "inherit",
                  minWidth: isCompact ? 0 : 38,
                  justifyContent: "center",
                }}
              >
                {item.icon}
              </ListItemIcon>

              {!isCompact && (
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontWeight: 600,
                  }}
                />
              )}
            </ListItemButton>
          );

          /*
           * Tablet navigation:
           * icon-only drawer with tooltip labels.
           */
          return isCompact ? (
            <Tooltip
              key={item.to}
              title={item.label}
              placement="right"
            >
              {button}
            </Tooltip>
          ) : (
            button
          );
        })}
      </List>

      <Box sx={{ flexGrow: 1 }} />

      <Box
        sx={{
          px: isCompact ? 1 : 2,
          pb: 2,
          display: isCompact ? "flex" : "block",
          justifyContent: "center",
        }}
      >
        <Typography
          variant="caption"
          sx={{
            color: "rgba(255,255,255,0.42)",
            display: isCompact ? "none" : "block",
          }}
        >
          LeadFlow CRM
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
      }}
    >
      {/* =========================
          TOP APP BAR
      ========================== */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: isMobile
            ? "100%"
            : `calc(100% - ${drawerWidth}px)`,

          ml: isMobile ? 0 : `${drawerWidth}px`,

          bgcolor: "background.paper",
          color: "text.primary",

          borderBottom: "1px solid",
          borderColor: "divider",

          zIndex: (theme) =>
            theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar
          sx={{
            minHeight: "64px !important",
            gap: 1,
          }}
        >
          {/* Mobile hamburger */}
          {isMobile && (
            <IconButton
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
              edge="start"
              sx={{ mr: 0.5 }}
            >
              <MenuIcon />
            </IconButton>
          )}

          {/* Page title */}
          <Box
            sx={{
              flexGrow: 1,
              minWidth: 0,
            }}
          >
            <Typography
              variant="subtitle1"
              fontWeight={700}
              noWrap
            >
              {pageTitle}
            </Typography>

            {!isMobile && (
              <Typography
                variant="caption"
                color="text.secondary"
                noWrap
              >
                Manage your leads and follow-ups efficiently
              </Typography>
            )}
          </Box>

          {/* Notifications */}
          <NotificationBell />

          {/* User avatar */}
          <IconButton
            onClick={(e) =>
              setMenuAnchor(e.currentTarget)
            }
            aria-label="Open account menu"
            sx={{ p: 0.5 }}
          >
            <Avatar
              sx={{
                width: 36,
                height: 36,
                bgcolor: "primary.main",
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {initials || "U"}
            </Avatar>
          </IconButton>

          {/* User menu */}
          <Menu
            anchorEl={menuAnchor}
            open={Boolean(menuAnchor)}
            onClose={() => setMenuAnchor(null)}
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
                  minWidth: 210,
                  mt: 1,
                },
              },
            }}
          >
            <Box
              sx={{
                px: 2,
                py: 1.25,
              }}
            >
              <Typography
                variant="subtitle2"
                noWrap
              >
                {user?.fullName || "User"}
              </Typography>

              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  textTransform: "capitalize",
                }}
              >
                {user?.roleKey?.replaceAll("_", " ") ||
                  "User"}
              </Typography>
            </Box>

            <Divider />

            <MenuItem
              onClick={handleLogout}
              sx={{ gap: 1 }}
            >
              <ListItemIcon
                sx={{
                  minWidth: "auto !important",
                }}
              >
                <LogoutIcon fontSize="small" />
              </ListItemIcon>

              Log out
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* =========================
          MOBILE DRAWER
      ========================== */}
      {isMobile ? (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            zIndex: (theme) =>
              theme.zIndex.appBar + 1,

            "& .MuiDrawer-paper": {
              width: MOBILE_DRAWER_WIDTH,
              boxSizing: "border-box",
              bgcolor: "primary.dark",
              color: "#EEF0FF",
              border: "none",
            },
          }}
        >
          {drawerContent}
        </Drawer>
      ) : (
        /* =========================
           TABLET + DESKTOP DRAWER
        ========================== */
        <Drawer
          variant="permanent"
          sx={{
            width: drawerWidth,
            flexShrink: 0,

            "& .MuiDrawer-paper": {
              width: drawerWidth,
              boxSizing: "border-box",

              bgcolor: "primary.dark",
              color: "#EEF0FF",

              border: "none",
              overflowX: "hidden",

              transition: (theme) =>
                theme.transitions.create(
                  "width",
                  {
                    duration:
                      theme.transitions.duration
                        .standard,
                  }
                ),
            },
          }}
        >
          {drawerContent}
        </Drawer>
      )}

      {/* =========================
          PAGE CONTENT
      ========================== */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: "100%",

          mt: "64px",

          p: {
            xs: 2,
            sm: 2.5,
            md: 3,
          },

          bgcolor: "background.default",

          minHeight:
            "calc(100vh - 64px)",

          overflowX: "hidden",
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}
