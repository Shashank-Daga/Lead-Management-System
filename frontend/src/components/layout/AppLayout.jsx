import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  AppBar,
  Avatar,
  Box,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/SpaceDashboardOutlined";
import LeadsIcon from "@mui/icons-material/GroupsOutlined";
import UsersIcon from "@mui/icons-material/BadgeOutlined";
import LogoutIcon from "@mui/icons-material/LogoutOutlined";
import { useState } from "react";
import NotificationBell from "./NotificationBell";
import { loggedOut, selectCurrentUser } from "../../features/auth/authSlice";
import usePermission from "../../hooks/usePermission";
import { PERMISSIONS } from "../../config/permissions";

const DRAWER_WIDTH = 240;

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: <DashboardIcon /> },
  { to: "/leads", label: "Leads", icon: <LeadsIcon /> },
];

export default function AppLayout() {
  const user = useSelector(selectCurrentUser);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const canManageUsers = usePermission(PERMISSIONS.USER_MANAGE);
  const [menuAnchor, setMenuAnchor] = useState(null);

  const handleLogout = () => {
    dispatch(loggedOut());
    navigate("/login");
  };

  const navItems = canManageUsers
    ? [...NAV_ITEMS, { to: "/users", label: "Users", icon: <UsersIcon /> }]
    : NAV_ITEMS;

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: `calc(100% - ${DRAWER_WIDTH}px)`,
          ml: `${DRAWER_WIDTH}px`,
          bgcolor: "background.paper",
          color: "text.primary",
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Toolbar sx={{ justifyContent: "flex-end" }}>
          <NotificationBell />
          <IconButton onClick={(e) => setMenuAnchor(e.currentTarget)}>
            <Avatar sx={{ width: 34, height: 34, bgcolor: "primary.main", fontSize: 14 }}>
              {user?.fullName
                ?.split(" ")
                .map((p) => p[0])
                .slice(0, 2)
                .join("")}
            </Avatar>
          </IconButton>
          <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
            <Box sx={{ px: 2, py: 1 }}>
              <Typography variant="subtitle2">{user?.fullName}</Typography>
              <Typography variant="caption" color="text.secondary">
                {user?.roleKey}
              </Typography>
            </Box>
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              Log out
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: DRAWER_WIDTH,
            boxSizing: "border-box",
            bgcolor: "primary.dark",
            color: "#EEF0FF",
            border: "none",
          },
        }}
      >
        <Toolbar sx={{ px: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: 0.5 }}>
            LeadFlow
          </Typography>
        </Toolbar>
        <List sx={{ px: 1.5 }}>
          {navItems.map((item) => (
            <ListItemButton
              key={item.to}
              component={NavLink}
              to={item.to}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                color: "inherit",
                "&.active": { bgcolor: "rgba(255,255,255,0.12)" },
                "&:hover": { bgcolor: "rgba(255,255,255,0.08)" },
              }}
            >
              <ListItemIcon sx={{ color: "inherit", minWidth: 36 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          ))}
        </List>
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          ml: `${DRAWER_WIDTH}px`,
          mt: "64px",
          p: 3,
          bgcolor: "background.default",
          minHeight: "calc(100vh - 64px)",
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}
