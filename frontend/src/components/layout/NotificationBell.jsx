import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Badge,
  Box,
  CircularProgress,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Typography,
} from "@mui/material";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import { useSnackbar } from "notistack";
import { useListNotificationsQuery, useMarkNotificationReadMutation } from "../../api/apiSlice";

const POLL_INTERVAL_MS = 30000; // polling is sufficient for MVP; no websockets

export default function NotificationBell() {
  const navigate = useNavigate();
  const [anchor, setAnchor] = useState(null);
  const { data, isLoading, isError } = useListNotificationsQuery(undefined, {
    pollingInterval: POLL_INTERVAL_MS,
  });
  const [markRead] = useMarkNotificationReadMutation();
  const { enqueueSnackbar } = useSnackbar();

  const notifications = data || [];
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  /**
   * Resolves where a notification should take the user, from its metadata.
   * Falls back to `null` (no navigation) for notification types nothing else
   * links to yet, rather than guessing at a URL.
   */
  const resolveDestination = (notification) => {
    const meta = notification.metadata || {};
    if (meta.leadId) return `/leads/${meta.leadId}`;
    if (meta.executiveId) {
      // No standalone per-executive page exists — the most useful equivalent
      // context is "this executive's leads", which the Leads list can filter
      // to via a deep-linked (not otherwise exposed) assignedTo param.
      const params = new URLSearchParams({ assignedTo: meta.executiveId });
      if (meta.executiveName) params.set("assignedToName", meta.executiveName);
      return `/leads?${params.toString()}`;
    }
    return null;
  };

  const handleClick = async (notification) => {
    const destination = resolveDestination(notification);
    if (!notification.isRead) {
      try {
        await markRead(notification.id).unwrap();
      } catch (err) {
        enqueueSnackbar(err?.data?.message || "Could not mark notification as read", {
          variant: "error",
        });
        // Still navigate — a failed read-receipt shouldn't strand the user on
        // a dead menu when they clearly wanted to go look at the lead/team.
      }
    }
    setAnchor(null);
    if (destination) navigate(destination);
  };

  return (
    <>
      <IconButton onClick={(e) => setAnchor(e.currentTarget)} aria-label="Notifications" sx={{ mr: 1 }}>
        <Badge badgeContent={unreadCount} color="error" max={99}>
          <NotificationsNoneIcon />
        </Badge>
      </IconButton>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        PaperProps={{ sx: { width: 360, maxHeight: 420 } }}
      >
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="subtitle2">Notifications</Typography>
        </Box>
        <Divider />
        {isLoading && (
          <Box display="flex" justifyContent="center" py={3}>
            <CircularProgress size={22} />
          </Box>
        )}
        {isError && (
          <Box px={2} py={2}>
            <Typography variant="body2" color="error">
              Could not load notifications.
            </Typography>
          </Box>
        )}
        {!isLoading && !isError && notifications.length === 0 && (
          <Box px={2} py={3}>
            <Typography variant="body2" color="text.secondary">
              You&apos;re all caught up.
            </Typography>
          </Box>
        )}
        {notifications.map((n) => (
          <MenuItem
            key={n.id}
            onClick={() => handleClick(n)}
            sx={{
              display: "block",
              whiteSpace: "normal",
              bgcolor: n.isRead ? "transparent" : "action.hover",
            }}
          >
            <Typography variant="body2" fontWeight={n.isRead ? 400 : 700}>
              {n.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {n.message}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {new Date(n.createdAt).toLocaleString()}
            </Typography>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
