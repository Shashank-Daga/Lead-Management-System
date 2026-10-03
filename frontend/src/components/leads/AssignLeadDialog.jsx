import { useState } from "react";
import { useSelector } from "react-redux";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useSnackbar } from "notistack";
import { useAssignLeadMutation, useListAssignableUsersQuery } from "../../api/apiSlice";
import { selectCurrentUser } from "../../features/auth/authSlice";

export default function AssignLeadDialog({ open, onClose, leadId }) {
  const [userId, setUserId] = useState("");
  const [reason, setReason] = useState("");
  const [assignLead, { isLoading }] = useAssignLeadMutation();
  const { data: users = [], isLoading: loadingUsers, isError, error } = useListAssignableUsersQuery(undefined, { skip: !open });
  const { enqueueSnackbar } = useSnackbar();
  const currentUser = useSelector(selectCurrentUser);

  // The backend decides who is assignable (Admin: Executives; Manager: self +
  // own team) and re-validates on submit, so the UI trusts that list and only
  // drops inactive users. The current user is listed first, labelled "(you)".
  const assignableUsers = (users || [])
  .filter((u) => u.isActive)
  .sort((a, b) => {
    if (a.id === currentUser?.id) return -1;
    if (b.id === currentUser?.id) return 1;

    const roleOrder = { MANAGER: 0, EXECUTIVE: 1 };

    return (
      roleOrder[a.role?.key] - roleOrder[b.role?.key] ||
      a.fullName.localeCompare(b.fullName)
    );
  });

  const handleSubmit = async () => {
    if (!userId) return;
    try {
      await assignLead({ leadId, userId, reason }).unwrap();
      enqueueSnackbar("Lead assigned", { variant: "success" });
      onClose();
    } catch (err) {
      enqueueSnackbar(err?.data?.message || "Could not assign lead", { variant: "error" });
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Assign Lead</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {loadingUsers ? (
            <Typography variant="body2" color="text.secondary">Loading assignable users…</Typography>
          ) : isError ? (
            <Alert severity="error">{error?.data?.message || "Unable to load assignable users."}</Alert>
          ) : assignableUsers.length === 0 ? (
            <Alert severity="info">No assignable users are available for this account.</Alert>
          ) : (
            <TextField
              select
              label="Assign to"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            >
              {assignableUsers.map((u) => (
                <MenuItem key={u.id} value={u.id}>
                  {u.role?.key === "MANAGER" ? "(M) " : ""}
                  {u.fullName}
                  {u.id === currentUser?.id ? " (you)" : ""}
                </MenuItem>
              ))}
            </TextField>
          )}
          <TextField
            label="Reason (optional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            multiline
            rows={2}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={isLoading || !userId || loadingUsers || isError || assignableUsers.length === 0}>
          Assign
        </Button>
      </DialogActions>
    </Dialog>
  );
}
