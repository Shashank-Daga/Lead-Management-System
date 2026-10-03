import { useState } from "react";
import {
  Avatar,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import { useSnackbar } from "notistack";
import {
  useAddNoteMutation,
  useDeleteNoteMutation,
  useListNotesQuery,
  useUpdateNoteMutation,
} from "../../api/apiSlice";
import usePermission from "../../hooks/usePermission";
import { PERMISSIONS } from "../../config/permissions";
import ConfirmDialog from "../common/ConfirmDialog";
import { useSelector } from "react-redux";
import { selectCurrentUser } from "../../features/auth/authSlice";

function initials(fullName) {
  return fullName
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");
}

function NoteRow({ note, leadId }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note.body);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [updateNote, { isLoading: isSaving }] = useUpdateNoteMutation();
  const [deleteNote, { isLoading: isDeleting }] = useDeleteNoteMutation();
  const { enqueueSnackbar } = useSnackbar();
  const currentUser = useSelector(selectCurrentUser);

  // The backend independently re-checks author/permission on every request
  // (author OR lead.edit_all/lead.edit_scoped) — this is a UX convenience so
  // people who clearly can't act on a note don't see dead buttons.
  const canModifyAnyNote = usePermission(PERMISSIONS.LEAD_EDIT_ALL, PERMISSIONS.LEAD_EDIT_SCOPED);
  const isAuthor = currentUser && note.author.id === currentUser.id;
  const showControls = isAuthor || canModifyAnyNote;

  const handleSave = async () => {
    if (!draft.trim()) return;
    try {
      await updateNote({ leadId, noteId: note.id, body: draft }).unwrap();
      enqueueSnackbar("Note updated", { variant: "success" });
      setEditing(false);
    } catch (err) {
      enqueueSnackbar(err?.data?.message || "Could not update note", { variant: "error" });
    }
  };

  const handleCancel = () => {
    setDraft(note.body);
    setEditing(false);
  };

  const handleDelete = async () => {
    try {
      await deleteNote({ leadId, noteId: note.id }).unwrap();
      enqueueSnackbar("Note deleted", { variant: "success" });
      setDeleteOpen(false);
    } catch (err) {
      enqueueSnackbar(err?.data?.message || "Could not delete note", { variant: "error" });
      setDeleteOpen(false);
    }
  };

  return (
    <Stack direction="row" spacing={1.5}>
      <Avatar sx={{ width: 32, height: 32, fontSize: 13, bgcolor: "primary.main" }}>
        {initials(note.author.fullName)}
      </Avatar>
      <Box flex={1}>
        {editing ? (
          <Stack spacing={1}>
            <TextField
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              multiline
              minRows={2}
              fullWidth
              autoFocus
            />
            <Stack direction="row" spacing={1}>
              <Button size="small" variant="contained" onClick={handleSave} disabled={isSaving || !draft.trim()}>
                {isSaving ? "Saving…" : "Save"}
              </Button>
              <Button size="small" onClick={handleCancel} disabled={isSaving}>
                Cancel
              </Button>
            </Stack>
          </Stack>
        ) : (
          <>
            <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
              <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                {note.body}
              </Typography>
              {showControls && (
                <Stack direction="row" spacing={0.5}>
                  <IconButton size="small" onClick={() => setEditing(true)} aria-label="Edit note">
                    <EditOutlinedIcon fontSize="inherit" />
                  </IconButton>
                  <IconButton size="small" onClick={() => setDeleteOpen(true)} aria-label="Delete note">
                    <DeleteOutlineIcon fontSize="inherit" />
                  </IconButton>
                </Stack>
              )}
            </Stack>
            <Typography variant="caption" color="text.secondary">
              {note.author.fullName} · {new Date(note.createdAt).toLocaleString()}
              {note.updatedAt && note.updatedAt !== note.createdAt ? " (edited)" : ""}
            </Typography>
          </>
        )}
      </Box>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        isLoading={isDeleting}
        title="Delete this note?"
        message="This note will be permanently removed from the lead."
      />
    </Stack>
  );
}

export default function LeadNotesTab({ leadId }) {
  const [body, setBody] = useState("");
  const { data: notes, isLoading, isError, error } = useListNotesQuery(leadId);
  const [addNote, { isLoading: isSaving }] = useAddNoteMutation();
  const canAddNote = usePermission(PERMISSIONS.LEAD_ADD_NOTE);
  const { enqueueSnackbar } = useSnackbar();

  const handleAdd = async () => {
    if (!body.trim()) return;
    try {
      await addNote({ leadId, body }).unwrap();
      setBody("");
    } catch (err) {
      enqueueSnackbar(err?.data?.message || "Could not add note", { variant: "error" });
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
        {error?.data?.message || "Could not load notes."}
      </Typography>
    );
  }

  return (
    <Stack spacing={2}>
      {canAddNote && (
        <Stack direction="row" spacing={1.5}>
          <TextField
            placeholder="Add a note or remark…"
            fullWidth
            multiline
            minRows={2}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <Button
            variant="contained"
            onClick={handleAdd}
            disabled={isSaving || !body.trim()}
            sx={{ alignSelf: "flex-end" }}
          >
            {isSaving ? "Posting…" : "Post"}
          </Button>
        </Stack>
      )}

      {!notes?.length && (
        <Typography variant="body2" color="text.secondary">
          No notes yet.
        </Typography>
      )}

      <Stack spacing={2}>
        {notes?.map((note) => (
          <NoteRow key={note.id} note={note} leadId={leadId} />
        ))}
      </Stack>
    </Stack>
  );
}
