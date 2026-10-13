import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Popper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import CheckIcon from "@mui/icons-material/CheckOutlined";
import SearchIcon from "@mui/icons-material/SearchOutlined";
import { useSnackbar } from "notistack";
import { useAssignLeadMutation, useListAssignableUsersQuery } from "../../api/apiSlice";
import { selectCurrentUser } from "../../features/auth/authSlice";

export default function AssignLeadDialog({ open, onClose, leadId }) {
  const [userId, setUserId] = useState("");
  const [reason, setReason] = useState("");
  const [query, setQuery] = useState("");
  // The list stays hidden until the user clicks/focuses the "Assign to" box.
  const [listOpen, setListOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
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

  // Search box + dropdown (Sheets/Excel style): filter as you type, then pick.
  // Order follows the hierarchy (you, managers, executives, as sorted above) and
  // each name is tagged (M) / (E). Search matches the name.
  const matches = useMemo(() => {
    const text = query.trim().toLowerCase();
    return assignableUsers.filter(
      (u) => !text || (u.fullName || "").toLowerCase().includes(text)
    );
  }, [assignableUsers, query]);

  const roleTag = (u) => (u.role?.key === "MANAGER" ? "(M) " : "(E) ");
  const userLabel = (u) =>
    `${roleTag(u)}${u.fullName}${u.id === currentUser?.id ? " (you)" : ""}`;

  const selectedUser = assignableUsers.find((u) => u.id === userId);

  const pickUser = (id) => {
    setUserId(id);
    setListOpen(false);
  };

  const handleSearchKeyDown = (event) => {
    if (event.key === "Enter" && matches.length === 1) {
      event.preventDefault();
      pickUser(matches[0].id);
    } else if (event.key === "Escape" && listOpen) {
      // Close just the list, not the whole dialog.
      event.stopPropagation();
      setListOpen(false);
    } else if (!listOpen && event.key !== "Tab") {
      setListOpen(true);
    }
  };

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
            <Stack spacing={1}>
              <TextField
                label="Assign to"
                placeholder="Search by name"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setListOpen(true);
                }}
                onKeyDown={handleSearchKeyDown}
                onFocus={() => setListOpen(true)}
                onClick={() => setListOpen(true)}
                onBlur={() => setListOpen(false)}
                size="small"
                fullWidth
                ref={setAnchorEl}
                inputProps={{ "aria-label": "Search users to assign", maxLength: 100 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />

              {selectedUser && (
                <Typography variant="body2" color="text.secondary">
                  Selected: <strong>{userLabel(selectedUser)}</strong>
                </Typography>
              )}

              {/* Floating dropdown under the box: it overlays the dialog instead of
                  pushing the form down, and scrolls on its own. */}
              <Popper
                open={listOpen && Boolean(anchorEl)}
                anchorEl={anchorEl}
                placement="bottom-start"
                style={{ zIndex: 1500, width: anchorEl?.clientWidth }}
              >
                <Paper
                  elevation={8}
                  sx={{ mt: 0.5, maxHeight: 240, overflowY: "auto" }}
                  // Keep focus in the search box while clicking/scrolling the list,
                  // so the dropdown doesn't close before the click registers.
                  onMouseDown={(event) => event.preventDefault()}
                >
                  {matches.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                      No one matches “{query.trim()}”.
                    </Typography>
                  ) : (
                    <List dense disablePadding role="listbox" aria-label="Assignable users">
                      {matches.map((u) => (
                        <ListItemButton
                          key={u.id}
                          role="option"
                          aria-selected={u.id === userId}
                          selected={u.id === userId}
                          onClick={() => pickUser(u.id)}
                        >
                          <ListItemText primary={userLabel(u)} />
                          {u.id === userId && <CheckIcon fontSize="small" color="primary" />}
                        </ListItemButton>
                      ))}
                    </List>
                  )}
                </Paper>
              </Popper>
            </Stack>
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
