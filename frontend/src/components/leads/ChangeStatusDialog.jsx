import { useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from "@mui/material";
import { useSnackbar } from "notistack";
import { useChangeLeadStatusMutation } from "../../api/apiSlice";
import { ALL_STATUSES, STATUS_CONFIG } from "../../theme/leadDisplay";

export default function ChangeStatusDialog({ open, onClose, leadId, currentStatus }) {
  const [status, setStatus] = useState(currentStatus);
  const [comment, setComment] = useState("");
  const [lossReason, setLossReason] = useState("");
  const [changeStatus, { isLoading }] = useChangeLeadStatusMutation();
  const { enqueueSnackbar } = useSnackbar();

  const handleSubmit = async () => {
    try {
      await changeStatus({ leadId, status, comment, lossReason }).unwrap();
      enqueueSnackbar("Status updated", { variant: "success" });
      onClose();
    } catch (err) {
      enqueueSnackbar(err?.data?.message || "Could not update status", { variant: "error" });
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Change Status</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField select label="New Status" value={status} onChange={(e) => setStatus(e.target.value)}>
            {ALL_STATUSES.map((s) => (
              <MenuItem key={s} value={s}>
                {STATUS_CONFIG[s].label}
              </MenuItem>
            ))}
          </TextField>
          {status === "LOST" && (
            <TextField
              label="Loss Reason"
              value={lossReason}
              onChange={(e) => setLossReason(e.target.value)}
              fullWidth
            />
          )}
          <TextField
            label="Comment (optional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            multiline
            rows={2}
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={isLoading}>
          Update
        </Button>
      </DialogActions>
    </Dialog>
  );
}
