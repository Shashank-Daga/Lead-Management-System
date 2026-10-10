import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ReplayIcon from "@mui/icons-material/Replay";
import EventOutlinedIcon from "@mui/icons-material/EventOutlined";
import AccessTimeOutlinedIcon from "@mui/icons-material/AccessTimeOutlined";

import { useSnackbar } from "notistack";

import {
  useCreateFollowUpMutation,
  useDeleteFollowUpMutation,
  useListFollowUpsQuery,
  useUpdateFollowUpMutation,
} from "../../api/apiSlice";

import ConfirmDialog from "../common/ConfirmDialog";


const STATUS_META = {
  PENDING: {
    label: "Pending",
    color: "default",
  },
  COMPLETED: {
    label: "Completed",
    color: "success",
  },
  CANCELLED: {
    label: "Cancelled",
    color: "default",
  },
};


function isOverdue(followUp) {
  return (
    followUp.status === "PENDING" &&
    new Date(followUp.dueAt) < new Date()
  );
}


function toLocalInputValue(isoString) {
  const d = new Date(isoString);

  const pad = (n) => String(n).padStart(2, "0");

  return `${d.getFullYear()}-${pad(
    d.getMonth() + 1
  )}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
}


const NOTES_MAX_LENGTH = 1000;
const VALID_STATUSES = [
  "PENDING",
  "COMPLETED",
  "CANCELLED",
];


export function EditFollowUpDialog({
  open,
  onClose,
  leadId,
  followUp,
}) {
  const [dueAt, setDueAt] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("PENDING");
  const [fieldErrors, setFieldErrors] = useState({});

  const [updateFollowUp, { isLoading }] =
    useUpdateFollowUpMutation();

  const { enqueueSnackbar } = useSnackbar();


  useEffect(() => {
    if (!open || !followUp) return;

    setDueAt(toLocalInputValue(followUp.dueAt));
    setNotes(followUp.notes || "");
    setStatus(followUp.status || "PENDING");
    setFieldErrors({});
  }, [open, followUp?.id]);


  if (!followUp) return null;


  const validate = () => {
    const errors = {};

    if (!dueAt) {
      errors.dueAt = "Due date is required";
    } else if (
      Number.isNaN(new Date(dueAt).getTime())
    ) {
      errors.dueAt = "Enter a valid date and time";
    }

    if (notes.length > NOTES_MAX_LENGTH) {
      errors.notes = `Notes must be ${NOTES_MAX_LENGTH} characters or fewer`;
    }

    if (!VALID_STATUSES.includes(status)) {
      errors.status = "Choose a valid status";
    }

    setFieldErrors(errors);

    return Object.keys(errors).length === 0;
  };


  const handleSave = async () => {
    if (!validate()) return;

    try {
      await updateFollowUp({
        leadId,
        followUpId: followUp.id,
        dueAt: new Date(dueAt).toISOString(),
        notes,
        status,
      }).unwrap();

      enqueueSnackbar("Follow-up updated", {
        variant: "success",
      });

      onClose();
    } catch (err) {
      enqueueSnackbar(
        err?.data?.message ||
          "Could not update follow-up",
        {
          variant: "error",
        }
      );
    }
  };


  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle sx={{ fontWeight: 700 }}>
        Edit Follow-Up
      </DialogTitle>

      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            type="datetime-local"
            label="Due"
            required
            fullWidth
            InputLabelProps={{ shrink: true }}
            value={dueAt}
            onChange={(e) =>
              setDueAt(e.target.value)
            }
            error={Boolean(fieldErrors.dueAt)}
            helperText={fieldErrors.dueAt}
          />

          <TextField
            select
            label="Status"
            fullWidth
            value={status}
            onChange={(e) =>
              setStatus(e.target.value)
            }
            error={Boolean(fieldErrors.status)}
            helperText={fieldErrors.status}
          >
            <MenuItem value="PENDING">
              Pending
            </MenuItem>

            <MenuItem value="COMPLETED">
              Completed
            </MenuItem>

            <MenuItem value="CANCELLED">
              Cancelled
            </MenuItem>
          </TextField>

          <TextField
            label="Notes"
            fullWidth
            value={notes}
            onChange={(e) =>
              setNotes(e.target.value)
            }
            multiline
            rows={3}
            error={Boolean(fieldErrors.notes)}
            helperText={
              fieldErrors.notes ||
              `${notes.length}/${NOTES_MAX_LENGTH}`
            }
          />
        </Stack>
      </DialogContent>

      <DialogActions
        sx={{
          px: 3,
          pb: 2,
        }}
      >
        <Button
          onClick={onClose}
          disabled={isLoading}
        >
          Cancel
        </Button>

        <Button
          variant="contained"
          onClick={handleSave}
          disabled={isLoading}
        >
          {isLoading ? "Saving…" : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}


function FollowUpSkeleton() {
  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 2.5,
        p: 2,
      }}
    >
      <Stack spacing={1}>
        <Skeleton width="40%" height={24} />
        <Skeleton width="80%" height={20} />
        <Skeleton width="50%" height={18} />
      </Stack>
    </Card>
  );
}


function FollowUpCard({
  followUp,
  onToggle,
  onEdit,
  onDelete,
  togglingId,
}) {
  const meta =
    STATUS_META[followUp.status] ||
    STATUS_META.PENDING;

  const overdue = isOverdue(followUp);

  const isCompleted =
    followUp.status === "COMPLETED";

  const isCancelled =
    followUp.status === "CANCELLED";


  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 2.5,
        opacity: isCancelled ? 0.65 : 1,
        transition: "border-color 0.2s ease",
        "&:hover": {
          borderColor: "primary.main",
        },
      }}
    >
      <Box sx={{ p: { xs: 1.75, sm: 2 } }}>
        <Stack spacing={1.5}>

          {/* Top row */}
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="flex-start"
            spacing={1}
          >
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              minWidth={0}
            >
              <Box
                sx={{
                  width: 34,
                  height: 34,
                  borderRadius: 1.5,
                  bgcolor: "action.hover",
                  color: "primary.main",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <EventOutlinedIcon fontSize="small" />
              </Box>

              <Box minWidth={0}>
                <Typography
                  variant="body2"
                  fontWeight={700}
                >
                  {new Date(
                    followUp.dueAt
                  ).toLocaleDateString()}
                </Typography>

                <Typography
                  variant="caption"
                  color="text.secondary"
                >
                  {new Date(
                    followUp.dueAt
                  ).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Typography>
              </Box>
            </Stack>

            <Stack
              direction="row"
              spacing={0.75}
              flexWrap="wrap"
              justifyContent="flex-end"
            >
              <Chip
                size="small"
                label={meta.label}
                color={meta.color}
                variant="outlined"
              />

              {overdue && (
                <Chip
                  size="small"
                  color="error"
                  label="Overdue"
                />
              )}
            </Stack>
          </Stack>


          {/* Notes */}
          {followUp.notes && (
            <Box
              sx={{
                px: 1.25,
                py: 1,
                borderRadius: 1.5,
                bgcolor: "action.hover",
              }}
            >
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  textDecoration: isCompleted
                    ? "line-through"
                    : "none",
                }}
              >
                {followUp.notes}
              </Typography>
            </Box>
          )}


          <Divider />


          {/* Footer */}
          <Stack
            direction={{
              xs: "column",
              sm: "row",
            }}
            justifyContent="space-between"
            alignItems={{
              xs: "stretch",
              sm: "center",
            }}
            spacing={1}
          >
            <Stack spacing={0.25}>
              <Typography
                variant="caption"
                color="text.secondary"
              >
                Owner:{" "}
                <Box
                  component="span"
                  sx={{
                    color: "text.primary",
                    fontWeight: 600,
                  }}
                >
                  {followUp.owner?.fullName ||
                    "—"}
                </Box>
              </Typography>

              {followUp.completedAt && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                >
                  Completed{" "}
                  {new Date(
                    followUp.completedAt
                  ).toLocaleString()}
                </Typography>
              )}
            </Stack>


            <Stack
              direction="row"
              spacing={0.5}
              justifyContent={{
                xs: "flex-end",
                sm: "initial",
              }}
            >
              <Button
                size="small"
                variant="text"
                startIcon={
                  isCompleted ? (
                    <ReplayIcon />
                  ) : (
                    <CheckCircleOutlineIcon />
                  )
                }
                onClick={() =>
                  onToggle(followUp)
                }
                disabled={
                  togglingId === followUp.id ||
                  isCancelled
                }
              >
                {isCompleted
                  ? "Mark pending"
                  : "Complete"}
              </Button>

              <IconButton
                size="small"
                onClick={() =>
                  onEdit(followUp)
                }
                aria-label="Edit follow-up"
              >
                <EditOutlinedIcon fontSize="small" />
              </IconButton>

              <IconButton
                size="small"
                color="error"
                onClick={() =>
                  onDelete(followUp)
                }
                aria-label="Delete follow-up"
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Stack>
          </Stack>

        </Stack>
      </Box>
    </Card>
  );
}


export default function LeadFollowUpsTab({
  leadId,
}) {
  const [dueAt, setDueAt] = useState("");
  const [notes, setNotes] = useState("");

  const {
    data: followUps,
    isLoading,
    isError,
    error,
  } = useListFollowUpsQuery(leadId);

  const [
    createFollowUp,
    { isLoading: isCreating },
  ] = useCreateFollowUpMutation();

  const [updateFollowUp] =
    useUpdateFollowUpMutation();

  const [
    deleteFollowUp,
    { isLoading: isDeleting },
  ] = useDeleteFollowUpMutation();

  const { enqueueSnackbar } = useSnackbar();

  const [editTarget, setEditTarget] =
    useState(null);

  const [deleteTarget, setDeleteTarget] =
    useState(null);

  const [togglingId, setTogglingId] =
    useState(null);


  const handleCreate = async () => {
    if (!dueAt) return;

    try {
      await createFollowUp({
        leadId,
        dueAt: new Date(dueAt).toISOString(),
        notes,
      }).unwrap();

      enqueueSnackbar(
        "Follow-up scheduled",
        {
          variant: "success",
        }
      );

      setDueAt("");
      setNotes("");
    } catch (err) {
      enqueueSnackbar(
        err?.data?.message ||
          "Could not schedule follow-up",
        {
          variant: "error",
        }
      );
    }
  };


  const handleToggleComplete = async (
    followUp
  ) => {
    const nextStatus =
      followUp.status === "COMPLETED"
        ? "PENDING"
        : "COMPLETED";

    setTogglingId(followUp.id);

    try {
      await updateFollowUp({
        leadId,
        followUpId: followUp.id,
        status: nextStatus,
      }).unwrap();
    } catch (err) {
      enqueueSnackbar(
        err?.data?.message ||
          "Could not update follow-up status",
        {
          variant: "error",
        }
      );
    } finally {
      setTogglingId(null);
    }
  };


  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      await deleteFollowUp({
        leadId,
        followUpId: deleteTarget.id,
      }).unwrap();

      enqueueSnackbar(
        "Follow-up deleted",
        {
          variant: "success",
        }
      );

      setDeleteTarget(null);
    } catch (err) {
      enqueueSnackbar(
        err?.data?.message ||
          "Could not delete follow-up",
        {
          variant: "error",
        }
      );

      setDeleteTarget(null);
    }
  };


  if (isLoading) {
    return (
      <Stack spacing={1.5}>
        <FollowUpSkeleton />
        <FollowUpSkeleton />
        <FollowUpSkeleton />
      </Stack>
    );
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
            "Could not load follow-ups."}
        </Typography>
      </Card>
    );
  }


  return (
    <Stack spacing={2.5}>

      {/* Create follow-up */}
      <Card
        variant="outlined"
        sx={{
          borderRadius: 2.5,
          bgcolor: "background.default",
        }}
      >
        <Box sx={{ p: { xs: 1.75, sm: 2 } }}>
          <Stack spacing={1.5}>

            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
            >
              <AccessTimeOutlinedIcon
                fontSize="small"
                color="primary"
              />

              <Typography
                variant="subtitle2"
                fontWeight={700}
              >
                Schedule a follow-up
              </Typography>
            </Stack>

            <Stack
              direction={{
                xs: "column",
                sm: "row",
              }}
              spacing={1.25}
            >
              <TextField
                type="datetime-local"
                label="Due"
                size="small"
                fullWidth
                InputLabelProps={{
                  shrink: true,
                }}
                value={dueAt}
                onChange={(e) =>
                  setDueAt(e.target.value)
                }
              />

              <TextField
                label="Notes (optional)"
                size="small"
                fullWidth
                value={notes}
                onChange={(e) =>
                  setNotes(e.target.value)
                }
              />

              <Button
                variant="contained"
                onClick={handleCreate}
                disabled={
                  isCreating || !dueAt
                }
                sx={{
                  minWidth: {
                    xs: "100%",
                    sm: 120,
                  },
                  flexShrink: 0,
                }}
              >
                {isCreating
                  ? "Scheduling…"
                  : "Schedule"}
              </Button>
            </Stack>

          </Stack>
        </Box>
      </Card>


      {/* Existing follow-ups */}
      <Box>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ mb: 1.25 }}
        >
          <Typography
            variant="subtitle2"
            fontWeight={700}
          >
            Scheduled follow-ups
          </Typography>

          {followUps?.length > 0 && (
            <Typography
              variant="caption"
              color="text.secondary"
            >
              {followUps.length}{" "}
              {followUps.length === 1
                ? "follow-up"
                : "follow-ups"}
            </Typography>
          )}
        </Stack>


        {!followUps?.length ? (
          <Card
            variant="outlined"
            sx={{
              borderRadius: 2.5,
              p: 3,
              textAlign: "center",
              bgcolor: "action.hover",
            }}
          >
            <EventOutlinedIcon
              color="disabled"
              sx={{ fontSize: 34, mb: 1 }}
            />

            <Typography
              variant="body2"
              fontWeight={600}
            >
              No follow-ups scheduled
            </Typography>

            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                display: "block",
                mt: 0.5,
              }}
            >
              Schedule the next reminder above
              to keep the lead moving.
            </Typography>
          </Card>
        ) : (
          <Stack spacing={1.25}>
            {followUps.map((followUp) => (
              <FollowUpCard
                key={followUp.id}
                followUp={followUp}
                onToggle={
                  handleToggleComplete
                }
                onEdit={setEditTarget}
                onDelete={setDeleteTarget}
                togglingId={togglingId}
              />
            ))}
          </Stack>
        )}
      </Box>


      <EditFollowUpDialog
        open={Boolean(editTarget)}
        onClose={() =>
          setEditTarget(null)
        }
        leadId={leadId}
        followUp={editTarget}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() =>
          setDeleteTarget(null)
        }
        onConfirm={handleDelete}
        isLoading={isDeleting}
        title="Delete this follow-up?"
        message="This follow-up reminder will be permanently removed."
      />

    </Stack>
  );
}
