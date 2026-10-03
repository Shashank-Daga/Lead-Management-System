import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from "@mui/material";

/** Generic yes/no confirmation for destructive actions — used by lead delete, follow-up delete, note delete. */
export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Delete",
  isLoading = false,
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{message}</DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button variant="contained" color="error" onClick={onConfirm} disabled={isLoading}>
          {isLoading ? "Working…" : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
