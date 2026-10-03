import { Box, Chip, CircularProgress, Stack, Typography } from "@mui/material";
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

/**
 * Human-readable summary. The backend resolves assignment user IDs to names
 * (falling back to the raw ID only if the user no longer exists), so
 * ASSIGNED/REASSIGNED values here are names, not UUIDs.
 */
function describeEvent(event) {
  if (event.eventType === "ASSIGNED") return event.toValue || "";
  if (event.eventType === "REASSIGNED") {
    return event.fromValue ? `${event.fromValue} → ${event.toValue}` : event.toValue || "";
  }
  if (event.fromValue && event.toValue) return `${event.fromValue} → ${event.toValue}`;
  return event.toValue || "";
}

export default function LeadHistoryTab({ leadId }) {
  const { data: events, isLoading } = useGetLeadHistoryQuery(leadId);

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (!events?.length) {
    return (
      <Typography variant="body2" color="text.secondary" py={2}>
        No history recorded yet.
      </Typography>
    );
  }

  return (
    <Stack spacing={0} divider={<Box sx={{ borderBottom: "1px solid", borderColor: "divider" }} />}>
      {events.map((event) => (
        <Stack key={event.id} direction="row" spacing={2} alignItems="flex-start" py={1.5}>
          <Chip size="small" label={EVENT_LABELS[event.eventType] || event.eventType} />
          <Box flex={1}>
            <Typography variant="body2">
              {describeEvent(event)}
              {event.comment && (
                <Typography component="span" color="text.secondary">
                  {" "}
                  — {event.comment}
                </Typography>
              )}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {event.eventType === "ASSIGNED" || event.eventType === "REASSIGNED" ? `Assigned by ${event.actor.fullName}` : event.actor.fullName} · {new Date(event.createdAt).toLocaleString()}
            </Typography>
          </Box>
        </Stack>
      ))}
    </Stack>
  );
}
