import { useState } from "react";

import {
  Avatar,
  Box,
  Button,
  Card,
  Divider,
  IconButton,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import NotesOutlinedIcon from "@mui/icons-material/NotesOutlined";

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


function initials(fullName = "") {
  return fullName
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}


function NoteSkeleton() {
  return (
    <Stack
      direction="row"
      spacing={1.5}
      sx={{ py: 1 }}
    >
      <Skeleton
        variant="circular"
        width={36}
        height={36}
      />

      <Box flex={1}>
        <Skeleton width="35%" height={20} />
        <Skeleton width="90%" height={20} />
        <Skeleton width="65%" height={20} />
      </Box>
    </Stack>
  );
}


function NoteRow({
  note,
  leadId,
}) {
  const [editing, setEditing] =
    useState(false);

  const [draft, setDraft] =
    useState(note.body);

  const [deleteOpen, setDeleteOpen] =
    useState(false);

  const [
    updateNote,
    { isLoading: isSaving },
  ] = useUpdateNoteMutation();

  const [
    deleteNote,
    { isLoading: isDeleting },
  ] = useDeleteNoteMutation();

  const { enqueueSnackbar } =
    useSnackbar();

  const currentUser =
    useSelector(selectCurrentUser);


  const canModifyAnyNote =
    usePermission(
      PERMISSIONS.LEAD_EDIT_ALL,
      PERMISSIONS.LEAD_EDIT_SCOPED
    );

  const isAuthor =
    currentUser &&
    note.author.id === currentUser.id;

  const showControls =
    isAuthor || canModifyAnyNote;


  const handleSave = async () => {
    if (!draft.trim()) return;

    try {
      await updateNote({
        leadId,
        noteId: note.id,
        body: draft,
      }).unwrap();

      enqueueSnackbar(
        "Note updated",
        {
          variant: "success",
        }
      );

      setEditing(false);
    } catch (err) {
      enqueueSnackbar(
        err?.data?.message ||
          "Could not update note",
        {
          variant: "error",
        }
      );
    }
  };


  const handleCancel = () => {
    setDraft(note.body);
    setEditing(false);
  };


  const handleDelete = async () => {
    try {
      await deleteNote({
        leadId,
        noteId: note.id,
      }).unwrap();

      enqueueSnackbar(
        "Note deleted",
        {
          variant: "success",
        }
      );

      setDeleteOpen(false);
    } catch (err) {
      enqueueSnackbar(
        err?.data?.message ||
          "Could not delete note",
        {
          variant: "error",
        }
      );

      setDeleteOpen(false);
    }
  };


  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 2.5,
        transition: "border-color 0.2s ease",
        "&:hover": {
          borderColor: "primary.main",
        },
      }}
    >
      <Box
        sx={{
          p: { xs: 1.75, sm: 2 },
        }}
      >
        <Stack
          direction="row"
          spacing={1.5}
          alignItems="flex-start"
        >
          <Avatar
            sx={{
              width: 36,
              height: 36,
              fontSize: 13,
              fontWeight: 700,
              bgcolor: "primary.main",
              flexShrink: 0,
            }}
          >
            {initials(
              note.author?.fullName
            )}
          </Avatar>


          <Box
            flex={1}
            minWidth={0}
          >
            {editing ? (
              <Stack spacing={1.25}>
                <TextField
                  value={draft}
                  onChange={(e) =>
                    setDraft(e.target.value)
                  }
                  multiline
                  minRows={3}
                  fullWidth
                  autoFocus
                />

                <Stack
                  direction="row"
                  spacing={1}
                  justifyContent="flex-end"
                >
                  <Button
                    size="small"
                    onClick={handleCancel}
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>

                  <Button
                    size="small"
                    variant="contained"
                    onClick={handleSave}
                    disabled={
                      isSaving ||
                      !draft.trim()
                    }
                  >
                    {isSaving
                      ? "Saving…"
                      : "Save"}
                  </Button>
                </Stack>
              </Stack>
            ) : (
              <>
                <Stack
                  direction={{
                    xs: "column",
                    sm: "row",
                  }}
                  justifyContent="space-between"
                  alignItems={{
                    xs: "stretch",
                    sm: "flex-start",
                  }}
                  spacing={1}
                >
                  <Box minWidth={0}>
                    <Typography
                      variant="subtitle2"
                      fontWeight={700}
                    >
                      {note.author?.fullName ||
                        "Unknown user"}
                    </Typography>

                    <Typography
                      variant="caption"
                      color="text.secondary"
                    >
                      {new Date(
                        note.createdAt
                      ).toLocaleString()}
                      {note.updatedAt &&
                      note.updatedAt !==
                        note.createdAt
                        ? " · Edited"
                        : ""}
                    </Typography>
                  </Box>


                  {showControls && (
                    <Stack
                      direction="row"
                      spacing={0.25}
                      justifyContent="flex-end"
                    >
                      <IconButton
                        size="small"
                        onClick={() =>
                          setEditing(true)
                        }
                        aria-label="Edit note"
                      >
                        <EditOutlinedIcon fontSize="small" />
                      </IconButton>

                      <IconButton
                        size="small"
                        color="error"
                        onClick={() =>
                          setDeleteOpen(true)
                        }
                        aria-label="Delete note"
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  )}
                </Stack>


                <Typography
                  variant="body2"
                  sx={{
                    mt: 1.25,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    lineHeight: 1.65,
                  }}
                >
                  {note.body}
                </Typography>
              </>
            )}
          </Box>
        </Stack>
      </Box>


      <ConfirmDialog
        open={deleteOpen}
        onClose={() =>
          setDeleteOpen(false)
        }
        onConfirm={handleDelete}
        isLoading={isDeleting}
        title="Delete this note?"
        message="This note will be permanently removed from the lead."
      />
    </Card>
  );
}


export default function LeadNotesTab({
  leadId,
}) {
  const [body, setBody] =
    useState("");

  const {
    data: notes,
    isLoading,
    isError,
    error,
  } = useListNotesQuery(leadId);

  const [
    addNote,
    { isLoading: isSaving },
  ] = useAddNoteMutation();

  const canAddNote =
    usePermission(
      PERMISSIONS.LEAD_ADD_NOTE
    );

  const { enqueueSnackbar } =
    useSnackbar();


  const handleAdd = async () => {
    if (!body.trim()) return;

    try {
      await addNote({
        leadId,
        body,
      }).unwrap();

      setBody("");

      enqueueSnackbar(
        "Note added",
        {
          variant: "success",
        }
      );
    } catch (err) {
      enqueueSnackbar(
        err?.data?.message ||
          "Could not add note",
        {
          variant: "error",
        }
      );
    }
  };


  if (isLoading) {
    return (
      <Stack spacing={1}>
        <NoteSkeleton />
        <NoteSkeleton />
        <NoteSkeleton />
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
            "Could not load notes."}
        </Typography>
      </Card>
    );
  }


  return (
    <Stack spacing={2.5}>

      {canAddNote && (
        <Card
          variant="outlined"
          sx={{
            borderRadius: 2.5,
            bgcolor: "background.default",
          }}
        >
          <Box
            sx={{
              p: {
                xs: 1.75,
                sm: 2,
              },
            }}
          >
            <Stack spacing={1.5}>

              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
              >
                <NotesOutlinedIcon
                  fontSize="small"
                  color="primary"
                />

                <Typography
                  variant="subtitle2"
                  fontWeight={700}
                >
                  Add a note
                </Typography>
              </Stack>

              <TextField
                placeholder="Add a note or remark…"
                fullWidth
                multiline
                minRows={3}
                maxRows={8}
                value={body}
                onChange={(e) =>
                  setBody(e.target.value)
                }
              />

              <Stack
                direction="row"
                justifyContent="flex-end"
              >
                <Button
                  variant="contained"
                  onClick={handleAdd}
                  disabled={
                    isSaving ||
                    !body.trim()
                  }
                >
                  {isSaving
                    ? "Posting…"
                    : "Post note"}
                </Button>
              </Stack>

            </Stack>
          </Box>
        </Card>
      )}


      {!notes?.length ? (
        <Card
          variant="outlined"
          sx={{
            borderRadius: 2.5,
            p: 3,
            textAlign: "center",
            bgcolor: "action.hover",
          }}
        >
          <NotesOutlinedIcon
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
            No notes yet
          </Typography>

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              display: "block",
              mt: 0.5,
            }}
          >
            Add a note to keep useful
            context with this lead.
          </Typography>
        </Card>
      ) : (
        <Stack spacing={1.25}>
          {notes.map((note) => (
            <NoteRow
              key={note.id}
              note={note}
              leadId={leadId}
            />
          ))}
        </Stack>
      )}

    </Stack>
  );
}
