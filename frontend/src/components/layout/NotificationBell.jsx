import { useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  Badge,
  Box,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";

import NotificationsNoneRoundedIcon from "@mui/icons-material/NotificationsNoneRounded";
import NotificationsActiveOutlinedIcon from "@mui/icons-material/NotificationsActiveOutlined";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";

import { useSnackbar } from "notistack";

import {
  useListNotificationsQuery,
  useMarkNotificationReadMutation,
} from "../../api/apiSlice";


const POLL_INTERVAL_MS = 30000;


function formatNotificationDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString();
}


function NotificationItem({
  notification,
  onClick,
}) {
  const unread = !notification.isRead;

  return (
    <MenuItem
      onClick={() => onClick(notification)}
      sx={{
        display: "block",
        whiteSpace: "normal",
        px: 2,
        py: 1.5,
        borderLeft: unread
          ? "3px solid"
          : "3px solid transparent",
        borderColor: unread
          ? "primary.main"
          : "transparent",
        bgcolor: unread
          ? "action.hover"
          : "transparent",
        "&:hover": {
          bgcolor: "action.selected",
        },
      }}
    >
      <Stack spacing={0.6}>

        <Stack
          direction="row"
          spacing={1}
          alignItems="flex-start"
        >
          <Box flex={1} minWidth={0}>
            <Typography
              variant="body2"
              fontWeight={unread ? 700 : 500}
              sx={{
                wordBreak: "break-word",
              }}
            >
              {notification.title}
            </Typography>

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                mt: 0.35,
                lineHeight: 1.45,
                wordBreak: "break-word",
              }}
            >
              {notification.message}
            </Typography>
          </Box>

          {unread && (
            <Box
              sx={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                bgcolor: "primary.main",
                flexShrink: 0,
                mt: 0.7,
              }}
            />
          )}
        </Stack>

        <Typography
          variant="caption"
          color="text.secondary"
        >
          {formatNotificationDate(
            notification.createdAt
          )}
        </Typography>

        {notification.metadata?.leadId && (
          <Stack
            direction="row"
            spacing={0.5}
            alignItems="center"
            sx={{
              color: "primary.main",
              pt: 0.25,
            }}
          >
            <Typography
              variant="caption"
              fontWeight={600}
            >
              Open lead
            </Typography>

            <ArrowForwardRoundedIcon
              sx={{ fontSize: 14 }}
            />
          </Stack>
        )}

      </Stack>
    </MenuItem>
  );
}


export default function NotificationBell() {
  const navigate = useNavigate();

  const theme = useTheme();

  const isMobile = useMediaQuery(
    theme.breakpoints.down("sm")
  );

  const [anchor, setAnchor] =
    useState(null);

  const {
    data,
    isLoading,
    isError,
  } = useListNotificationsQuery(
    undefined,
    {
      pollingInterval:
        POLL_INTERVAL_MS,
    }
  );

  const [markRead] =
    useMarkNotificationReadMutation();

  const { enqueueSnackbar } =
    useSnackbar();


  const notifications = data || [];

  const unreadCount =
    notifications.filter(
      (notification) =>
        !notification.isRead
    ).length;


  /**
   * Resolves where a notification should take
   * the user, using only destinations that
   * already exist in the application.
   */
  const resolveDestination = (
    notification
  ) => {
    const meta =
      notification.metadata || {};

    if (meta.leadId) {
      return `/leads/${meta.leadId}`;
    }

    if (meta.executiveId) {
      const params =
        new URLSearchParams({
          assignedTo:
            meta.executiveId,
        });

      if (meta.executiveName) {
        params.set(
          "assignedToName",
          meta.executiveName
        );
      }

      return `/leads?${params.toString()}`;
    }

    return null;
  };


  const handleOpen = (event) => {
    setAnchor(event.currentTarget);
  };


  const handleClose = () => {
    setAnchor(null);
  };


  const handleClick = async (
    notification
  ) => {
    const destination =
      resolveDestination(
        notification
      );


    if (!notification.isRead) {
      try {
        await markRead(
          notification.id
        ).unwrap();
      } catch (err) {
        enqueueSnackbar(
          err?.data?.message ||
            "Could not mark notification as read",
          {
            variant: "error",
          }
        );

        // Navigation still proceeds.
      }
    }


    handleClose();


    if (destination) {
      navigate(destination);
    }
  };


  return (
    <>
      <IconButton
        onClick={handleOpen}
        aria-label={
          unreadCount > 0
            ? `${unreadCount} unread notifications`
            : "Notifications"
        }
        sx={{
          mr: 1,
          width: 42,
          height: 42,
        }}
      >
        <Badge
          badgeContent={
            unreadCount > 99
              ? "99+"
              : unreadCount
          }
          color="error"
          overlap="circular"
        >
          {unreadCount > 0 ? (
            <NotificationsActiveOutlinedIcon />
          ) : (
            <NotificationsNoneRoundedIcon />
          )}
        </Badge>
      </IconButton>


      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        PaperProps={{
          sx: {
            width: isMobile
              ? "calc(100vw - 24px)"
              : 380,

            maxWidth: 380,

            maxHeight: {
              xs: "70vh",
              sm: 480,
            },

            borderRadius: 2.5,
            mt: 1,
          },
        }}
        MenuListProps={{
          disablePadding: true,
        }}
      >

        {/* Header */}
        <Box
          sx={{
            px: 2,
            py: 1.5,
          }}
        >
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Box>
              <Typography
                variant="subtitle1"
                fontWeight={750}
              >
                Notifications
              </Typography>

              <Typography
                variant="caption"
                color="text.secondary"
              >
                {unreadCount > 0
                  ? `${unreadCount} unread`
                  : "You're all caught up"}
              </Typography>
            </Box>

            {unreadCount > 0 && (
              <Box
                sx={{
                  minWidth: 8,
                  height: 8,
                  borderRadius: "50%",
                  bgcolor:
                    "error.main",
                }}
              />
            )}
          </Stack>
        </Box>


        <Divider />


        {/* Loading */}
        {isLoading && (
          <Box
            sx={{
              px: 2,
              py: 4,
              textAlign: "center",
            }}
          >
            <NotificationsNoneRoundedIcon
              color="disabled"
              sx={{
                fontSize: 30,
                mb: 1,
              }}
            />

            <Typography
              variant="body2"
              color="text.secondary"
            >
              Loading notifications…
            </Typography>
          </Box>
        )}


        {/* Error */}
        {isError && (
          <Box
            sx={{
              px: 2,
              py: 3,
            }}
          >
            <Typography
              variant="body2"
              color="error"
              fontWeight={600}
            >
              Could not load notifications.
            </Typography>

            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                display: "block",
                mt: 0.5,
              }}
            >
              Please try again in a moment.
            </Typography>
          </Box>
        )}


        {/* Empty */}
        {!isLoading &&
          !isError &&
          notifications.length === 0 && (
            <Box
              sx={{
                px: 2,
                py: 4,
                textAlign: "center",
              }}
            >
              <NotificationsNoneRoundedIcon
                color="disabled"
                sx={{
                  fontSize: 36,
                  mb: 1,
                }}
              />

              <Typography
                variant="body2"
                fontWeight={600}
              >
                You're all caught up
              </Typography>

              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  display: "block",
                  mt: 0.5,
                }}
              >
                New notifications will appear
                here automatically.
              </Typography>
            </Box>
          )}


        {/* Notifications */}
        {!isLoading &&
          !isError &&
          notifications.map(
            (notification) => (
              <NotificationItem
                key={notification.id}
                notification={
                  notification
                }
                onClick={handleClick}
              />
            )
          )}

      </Menu>
    </>
  );
}
