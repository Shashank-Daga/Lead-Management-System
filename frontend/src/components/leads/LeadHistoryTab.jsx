import {
  Box,
  Card,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";

import AddCircleOutlineRoundedIcon from "@mui/icons-material/AddCircleOutlineRounded";
import SwapHorizRoundedIcon from "@mui/icons-material/SwapHorizRounded";
import PersonAddAlt1OutlinedIcon from "@mui/icons-material/PersonAddAlt1Outlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import FlagOutlinedIcon from "@mui/icons-material/FlagOutlined";

import { useGetLeadHistoryQuery } from "../../api/apiSlice";


const EVENT_LABELS = {
  CREATED: "Lead created",
  STATUS_CHANGE: "Status changed",
  PRIORITY_CHANGE: "Priority changed",
  ASSIGNED: "Assigned",
  REASSIGNED: "Reassigned",
  FIELD_UPDATE: "Details updated",
  DELETED: "Deleted",
};


const EVENT_ICONS = {
  CREATED: AddCircleOutlineRoundedIcon,
  STATUS_CHANGE: SwapHorizRoundedIcon,
  PRIORITY_CHANGE: FlagOutlinedIcon,
  ASSIGNED: PersonAddAlt1OutlinedIcon,
  REASSIGNED: PersonAddAlt1OutlinedIcon,
  FIELD_UPDATE: EditOutlinedIcon,
  DELETED: EditOutlinedIcon,
};


function describeEvent(event) {
  if (event.eventType === "ASSIGNED") {
    return event.toValue || "";
  }

  if (event.eventType === "REASSIGNED") {
    return event.fromValue
      ? `${event.fromValue} → ${event.toValue}`
      : event.toValue || "";
  }

  if (
    event.fromValue &&
    event.toValue
  ) {
    return `${event.fromValue} → ${event.toValue}`;
  }

  return event.toValue || "";
}


function HistorySkeleton() {
  return (
    <Stack spacing={2}>
      {Array.from({ length: 4 }).map(
        (_, index) => (
          <Stack
            key={index}
            direction="row"
            spacing={1.5}
          >
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                bgcolor: "action.hover",
                flexShrink: 0,
              }}
            />

            <Box flex={1}>
              <Box
                sx={{
                  width: "35%",
                  height: 18,
                  bgcolor: "action.hover",
                  borderRadius: 1,
                }}
              />

              <Box
                sx={{
                  width: "70%",
                  height: 18,
                  bgcolor: "action.hover",
                  borderRadius: 1,
                  mt: 0.75,
                }}
              />

              <Box
                sx={{
                  width: "45%",
                  height: 14,
                  bgcolor: "action.hover",
                  borderRadius: 1,
                  mt: 0.75,
                }}
              />
            </Box>
          </Stack>
        )
      )}
    </Stack>
  );
}


function HistoryItem({
  event,
  isLast,
}) {
  const Icon =
    EVENT_ICONS[event.eventType] ||
    EditOutlinedIcon;

  const label =
    EVENT_LABELS[event.eventType] ||
    event.eventType;

  const isAssignment =
    event.eventType === "ASSIGNED" ||
    event.eventType === "REASSIGNED";


  return (
    <Stack
      direction="row"
      spacing={1.5}
      alignItems="stretch"
    >
      {/* Timeline */}
      <Stack
        alignItems="center"
        sx={{
          width: 36,
          flexShrink: 0,
        }}
      >
        <Box
          sx={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            bgcolor: "action.hover",
            color: "primary.main",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1,
          }}
        >
          <Icon fontSize="small" />
        </Box>

        {!isLast && (
          <Box
            sx={{
              width: 1,
              flex: 1,
              minHeight: 24,
              bgcolor: "divider",
            }}
          />
        )}
      </Stack>


      {/* Event */}
      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          pb: isLast ? 0 : 2.25,
        }}
      >
        <Card
          variant="outlined"
          sx={{
            borderRadius: 2.5,
            p: {
              xs: 1.5,
              sm: 2,
            },
          }}
        >
          <Stack spacing={0.75}>

            <Stack
              direction={{
                xs: "column",
                sm: "row",
              }}
              justifyContent="space-between"
              alignItems={{
                xs: "flex-start",
                sm: "center",
              }}
              spacing={0.75}
            >
              <Chip
                size="small"
                label={label}
                variant="outlined"
              />

              <Typography
                variant="caption"
                color="text.secondary"
              >
                {new Date(
                  event.createdAt
                ).toLocaleString()}
              </Typography>
            </Stack>


            {describeEvent(event) && (
              <Typography
                variant="body2"
                fontWeight={600}
                sx={{
                  wordBreak: "break-word",
                }}
              >
                {describeEvent(event)}
              </Typography>
            )}


            {event.comment && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {event.comment}
              </Typography>
            )}


            {event.actor?.fullName && (
              <Typography
                variant="caption"
                color="text.secondary"
              >
                {isAssignment
                  ? `Assigned by ${event.actor.fullName}`
                  : `By ${event.actor.fullName}`}
              </Typography>
            )}

          </Stack>
        </Card>
      </Box>
    </Stack>
  );
}


export default function LeadHistoryTab({
  leadId,
}) {
  const {
    data: events,
    isLoading,
    isError,
    error,
  } = useGetLeadHistoryQuery(leadId);


  if (isLoading) {
    return <HistorySkeleton />;
  }


  if (isError) {
    return (
      <Card
        variant="outlined"
        sx={{
          borderRadius: 2.5,
          p: 2,
        }}
      >
        <Typography
          variant="body2"
          color="error"
        >
          {error?.data?.message ||
            "Could not load lead history."}
        </Typography>
      </Card>
    );
  }


  if (!events?.length) {
    return (
      <Card
        variant="outlined"
        sx={{
          borderRadius: 2.5,
          p: 3,
          textAlign: "center",
          bgcolor: "action.hover",
        }}
      >
        <EditOutlinedIcon
          color="disabled"
          sx={{
            fontSize: 34,
            mb: 1,
          }}
        />

        <Typography
          variant="body2"
          fontWeight={600}
        >
          No history recorded yet
        </Typography>

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            display: "block",
            mt: 0.5,
          }}
        >
          Changes made to this lead will
          appear here.
        </Typography>
      </Card>
    );
  }


  return (
    <Stack>
      {events.map((event, index) => (
        <HistoryItem
          key={event.id}
          event={event}
          isLast={
            index === events.length - 1
          }
        />
      ))}
    </Stack>
  );
}
