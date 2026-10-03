import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ReplayIcon from "@mui/icons-material/Replay";
import { useSnackbar } from "notistack";
import {
  useCreateFollowUpMutation,
  useDeleteFollowUpMutation,
  useListFollowUpsQuery,
  useUpdateFollowUpMutation,
} from "../../api/apiSlice";
import ConfirmDialog from "../common/ConfirmDialog";

const STATUS_META = {
  PENDING: { label: "Pending", color: "default" },
  COMPLETED: { label: "Completed", color: "success" },
  CANCELLED: { label: "Cancelled", color: "default" },
};

function isOverdue(f) {
  return f.status === "PENDING" && new Date(f.dueAt) < new Date();
}

/** Converts an ISO datetime to the value a <input type="datetime-local"> expects (local time, no seconds/zone). */
function toLocalInputValue(isoString) {
  const d = new Date(isoString);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
}

const NOTES_MAX_LENGTH = 1000;
const VALID_STATUSES = ["PENDING", "COMPLETED", "CANCELLED"];

export function EditFollowUpDialog({ open, onClose, leadId, followUp }) {
  const [dueAt, setDueAt] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("PENDING");
  const [fieldErrors, setFieldErrors] = useState({});
  const [updateFollowUp, { isLoading }] = useUpdateFollowUpMutation();
  const { enqueueSnackbar } = useSnackbar();

  // Re-seed the form whenever a *different* follow-up is opened. Keying on
  // `followUp?.id` (rather than the whole object) is what makes this fire on
  // A -> close -> B, not just on first mount: without this effect the dialog
  // component instance stays alive across opens and silently keeps A's values.
  useEffect(() => {
    if (!open || !followUp) return;
    setDueAt(toLocalInputValue(followUp.dueAt));
    setNotes(followUp.notes || "");
    setStatus(followUp.status || "PENDING");
    setFieldErrors({});
  }, [open, followUp?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!followUp) return null;

  const validate = () => {
    const errors = {};
    if (!dueAt) {
      errors.dueAt = "Due date is required";
    } else if (Number.isNaN(new Date(dueAt).getTime())) {
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
    // Client-side validation is a UX convenience only — the backend schema
    // (updateFollowUpSchema) independently re-validates and remains authoritative.
    if (!validate()) return;
    try {
      await updateFollowUp({
        leadId,
        followUpId: followUp.id,
        dueAt: new Date(dueAt).toISOString(),
        notes,
        status,
      }).unwrap();
      enqueueSnackbar("Follow-up updated", { variant: "success" });
      onClose();
    } catch (err) {
      enqueueSnackbar(err?.data?.message || "Could not update follow-up", { variant: "error" });
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Edit Follow-Up</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            type="datetime-local"
            label="Due"
            required
            InputLabelProps={{ shrink: true }}
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
            error={Boolean(fieldErrors.dueAt)}
            helperText={fieldErrors.dueAt}
          />
          <TextField
            select
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            error={Boolean(fieldErrors.status)}
            helperText={fieldErrors.status}
          >
            <MenuItem value="PENDING">Pending</MenuItem>
            <MenuItem value="COMPLETED">Completed</MenuItem>
            <MenuItem value="CANCELLED">Cancelled</MenuItem>
          </TextField>
          <TextField
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            multiline
            rows={2}
            error={Boolean(fieldErrors.notes)}
            helperText={fieldErrors.notes || `${notes.length}/${NOTES_MAX_LENGTH}`}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSave} disabled={isLoading}>
          {isLoading ? "Saving…" : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function LeadFollowUpsTab({ leadId }) {
  const [dueAt, setDueAt] = useState("");
  const [notes, setNotes] = useState("");
  const { data: followUps, isLoading, isError, error } = useListFollowUpsQuery(leadId);
  const [createFollowUp, { isLoading: isCreating }] = useCreateFollowUpMutation();
  const [updateFollowUp] = useUpdateFollowUpMutation();
  const [deleteFollowUp, { isLoading: isDeleting }] = useDeleteFollowUpMutation();
  const { enqueueSnackbar } = useSnackbar();

  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  const handleCreate = async () => {
    if (!dueAt) return;
    try {
      await createFollowUp({ leadId, dueAt: new Date(dueAt).toISOString(), notes }).unwrap();
      enqueueSnackbar("Follow-up scheduled", { variant: "success" });
      setDueAt("");
      setNotes("");
    } catch (err) {
      enqueueSnackbar(err?.data?.message || "Could not schedule follow-up", { variant: "error" });
    }
  };

  const handleToggleComplete = async (followUp) => {
    const nextStatus = followUp.status === "COMPLETED" ? "PENDING" : "COMPLETED";
    setTogglingId(followUp.id);
    try {
      await updateFollowUp({ leadId, followUpId: followUp.id, status: nextStatus }).unwrap();
    } catch (err) {
      enqueueSnackbar(err?.data?.message || "Could not update follow-up status", {
        variant: "error",
      });
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteFollowUp({ leadId, followUpId: deleteTarget.id }).unwrap();
      enqueueSnackbar("Follow-up deleted", { variant: "success" });
      setDeleteTarget(null);
    } catch (err) {
      enqueueSnackbar(err?.data?.message || "Could not delete follow-up", { variant: "error" });
      setDeleteTarget(null);
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" py={3}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (isError) {
    return (
      <Typography variant="body2" color="error">
        {error?.data?.message || "Could not load follow-ups."}
      </Typography>
    );
  }

  return (
    <Stack spacing={2.5}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
        <TextField
          type="datetime-local"
          label="Due"
          size="small"
          InputLabelProps={{ shrink: true }}
          value={dueAt}
          onChange={(e) => setDueAt(e.target.value)}
        />
        <TextField
          label="Notes (optional)"
          size="small"
          fullWidth
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <Button variant="contained" onClick={handleCreate} disabled={isCreating || !dueAt}>
          {isCreating ? "Scheduling…" : "Schedule"}
        </Button>
      </Stack>

      {!followUps?.length && (
        <Typography variant="body2" color="text.secondary">
          No follow-ups scheduled.
        </Typography>
      )}

      <Stack spacing={0.5}>
        {followUps?.map((f) => {
          const meta = STATUS_META[f.status] || STATUS_META.PENDING;
          return (
            <Stack
              key={f.id}
              direction="row"
              alignItems="center"
              spacing={1.5}
              sx={{
                py: 1,
                borderBottom: "1px solid",
                borderColor: "divider",
                opacity: f.status === "CANCELLED" ? 0.6 : 1,
              }}
            >
              <IconButton
                size="small"
                onClick={() => handleToggleComplete(f)}
                disabled={togglingId === f.id || f.status === "CANCELLED"}
                title={f.status === "COMPLETED" ? "Mark as pending" : "Mark as completed"}
              >
                {f.status === "COMPLETED" ? (
                  <ReplayIcon fontSize="small" />
                ) : (
                  <CheckCircleOutlineIcon fontSize="small" />
                )}
              </IconButton>

              <Box flex={1}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography
                    variant="body2"
                    sx={{
                      textDecoration: f.status === "COMPLETED" ? "line-through" : "none",
                    }}
                  >
                    {new Date(f.dueAt).toLocaleString()} {f.notes && `— ${f.notes}`}
                  </Typography>
                  <Chip size="small" label={meta.label} color={meta.color} variant="outlined" />
                  {isOverdue(f) && <Chip size="small" color="error" label="Overdue" />}
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  Owner: {f.owner.fullName}
                  {f.completedAt && ` · Completed ${new Date(f.completedAt).toLocaleString()}`}
                </Typography>
              </Box>

              <IconButton size="small" onClick={() => setEditTarget(f)} aria-label="Edit follow-up">
                <EditOutlinedIcon fontSize="inherit" />
              </IconButton>
              <IconButton size="small" onClick={() => setDeleteTarget(f)} aria-label="Delete follow-up">
                <DeleteOutlineIcon fontSize="inherit" />
              </IconButton>
            </Stack>
          );
        })}
      </Stack>

      <EditFollowUpDialog
        open={Boolean(editTarget)}
        onClose={() => setEditTarget(null)}
        leadId={leadId}
        followUp={editTarget}
      />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        isLoading={isDeleting}
        title="Delete this follow-up?"
        message="This follow-up reminder will be permanently removed."
      />
    </Stack>
  );
}
