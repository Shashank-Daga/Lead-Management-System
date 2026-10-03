import { useEffect, useMemo, useState } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  MenuItem,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/AddOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import { useSnackbar } from "notistack";
import {
  useCreateUserMutation,
  useListUsersQuery,
  useUpdateUserMutation,
} from "../../api/apiSlice";

const ROLES = [
  { key: "ADMIN", label: "Admin" },
  { key: "MANAGER", label: "Manager" },
  { key: "EXECUTIVE", label: "Executive" },
];

/**
 * Manager dropdown shared by the create and edit dialogs. Only active
 * Managers are offered; the backend independently validates that the chosen
 * manager is an active Manager in the same organization.
 */
function ManagerSelect({ control, errors, managers }) {
  return (
    <Controller
      name="managerId"
      control={control}
      render={({ field }) => (
        <TextField
          select
          label="Manager"
          {...field}
          error={Boolean(errors.managerId)}
          helperText={
            errors.managerId?.message ||
            (managers.length === 0 ? "No active managers available — create a Manager first." : "")
          }
        >
          {managers.map((m) => (
            <MenuItem key={m.id} value={m.id}>
              {m.fullName}
            </MenuItem>
          ))}
        </TextField>
      )}
    />
  );
}

// An Executive must have a manager (mirrors backend validateUserHierarchy);
// Admin/Manager must not — the form clears managerId when the role changes.
const baseFields = {
  fullName: z.string().min(1, "Required").max(150),
  roleKey: z.enum(["ADMIN", "MANAGER", "EXECUTIVE"]),
  managerId: z.string().optional(),
};

function requireManagerForExecutive(data, ctx) {
  if (data.roleKey === "EXECUTIVE" && !data.managerId) {
    ctx.addIssue({ code: "custom", path: ["managerId"], message: "Select a manager" });
  }
}

const createSchema = z
  .object({
    ...baseFields,
    email: z.string().email("Enter a valid email"),
    password: z.string().min(8, "At least 8 characters"),
  })
  .superRefine(requireManagerForExecutive);

const editSchema = z
  .object({ ...baseFields, isActive: z.boolean() })
  .superRefine(requireManagerForExecutive);

function CreateUserDialog({ open, onClose, managers }) {
  const [createUser, { isLoading }] = useCreateUserMutation();
  const { enqueueSnackbar } = useSnackbar();
  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(createSchema),
    defaultValues: { fullName: "", email: "", password: "", roleKey: "EXECUTIVE", managerId: "" },
  });
  const roleKey = useWatch({ control, name: "roleKey" });

  useEffect(() => {
    if (roleKey !== "EXECUTIVE") setValue("managerId", "");
  }, [roleKey, setValue]);

  const handleClose = () => {
    reset();
    onClose();
  };

  const onSubmit = async (values) => {
    const payload = {
      fullName: values.fullName,
      email: values.email,
      password: values.password,
      roleKey: values.roleKey,
      ...(values.roleKey === "EXECUTIVE" ? { managerId: values.managerId } : {}),
    };
    try {
      await createUser(payload).unwrap();
      enqueueSnackbar("User created", { variant: "success" });
      handleClose();
    } catch (err) {
      enqueueSnackbar(err?.data?.message || "Could not create user", { variant: "error" });
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>New User</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Full Name"
            {...register("fullName")}
            error={Boolean(errors.fullName)}
            helperText={errors.fullName?.message}
          />
          <TextField
            label="Email"
            {...register("email")}
            error={Boolean(errors.email)}
            helperText={errors.email?.message}
          />
          <TextField
            label="Temporary Password"
            type="password"
            {...register("password")}
            error={Boolean(errors.password)}
            helperText={errors.password?.message}
          />
          <Controller
            name="roleKey"
            control={control}
            render={({ field }) => (
              <TextField select label="Role" {...field}>
                {ROLES.map((r) => (
                  <MenuItem key={r.key} value={r.key}>
                    {r.label}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />
          {roleKey === "EXECUTIVE" && (
            <ManagerSelect control={control} errors={errors} managers={managers} />
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSubmit(onSubmit)} disabled={isLoading}>
          {isLoading ? "Creating…" : "Create"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function EditUserDialog({ user, onClose, managers }) {
  const [updateUser, { isLoading }] = useUpdateUserMutation();
  const { enqueueSnackbar } = useSnackbar();

  const defaults = useMemo(
    () => ({
      fullName: user.fullName,
      roleKey: user.role.key,
      managerId: user.manager?.id || "",
      isActive: user.isActive,
    }),
    [user]
  );

  const {
    control,
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({ resolver: zodResolver(editSchema), defaultValues: defaults });
  const roleKey = useWatch({ control, name: "roleKey" });

  useEffect(() => {
    if (roleKey !== "EXECUTIVE") setValue("managerId", "");
  }, [roleKey, setValue]);

  // Offer only active managers, but keep the current one selectable even if
  // it was deactivated since — otherwise the Select would render blank.
  const options = useMemo(() => {
    const current = user.manager && !managers.some((m) => m.id === user.manager.id);
    return current ? [...managers, { ...user.manager }] : managers;
  }, [managers, user]);

  const onSubmit = async (values) => {
    try {
      await updateUser({
        userId: user.id,
        fullName: values.fullName,
        roleKey: values.roleKey,
        managerId: values.roleKey === "EXECUTIVE" ? values.managerId : null,
        isActive: values.isActive,
      }).unwrap();
      enqueueSnackbar("User updated", { variant: "success" });
      onClose();
    } catch (err) {
      enqueueSnackbar(err?.data?.message || "Could not update user", { variant: "error" });
    }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Edit User</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label="Email" value={user.email} disabled />
          <TextField
            label="Full Name"
            {...register("fullName")}
            error={Boolean(errors.fullName)}
            helperText={errors.fullName?.message}
          />
          <Controller
            name="roleKey"
            control={control}
            render={({ field }) => (
              <TextField select label="Role" {...field}>
                {ROLES.map((r) => (
                  <MenuItem key={r.key} value={r.key}>
                    {r.label}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />
          {roleKey === "EXECUTIVE" && (
            <ManagerSelect control={control} errors={errors} managers={options} />
          )}
          <Controller
            name="isActive"
            control={control}
            render={({ field }) => (
              <FormControlLabel
                control={<Switch checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />}
                label="Active"
              />
            )}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSubmit(onSubmit)} disabled={isLoading}>
          {isLoading ? "Saving…" : "Save Changes"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function UsersPage() {
  const { data: users, isLoading, isError, error } = useListUsersQuery();
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  const activeManagers = useMemo(
    () => (users || []).filter((u) => u.role.key === "MANAGER" && u.isActive),
    [users]
  );

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h5" fontWeight={700}>
          Users
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
          New User
        </Button>
      </Stack>

      {isError && <Alert severity="error">{error?.data?.message || "Could not load users."}</Alert>}

      <Card sx={{ borderRadius: 3 }} elevation={0} variant="outlined">
        {isLoading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress size={26} />
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Manager</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right" />
                </TableRow>
              </TableHead>
              <TableBody>
                {users?.map((user) => (
                  <TableRow key={user.id} hover>
                    <TableCell>{user.fullName}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Chip size="small" label={user.role.name} />
                    </TableCell>
                    <TableCell>{user.manager?.fullName || "—"}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        variant="outlined"
                        color={user.isActive ? "success" : "default"}
                        label={user.isActive ? "Active" : "Inactive"}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => setEditTarget(user)} aria-label="Edit user">
                        <EditOutlinedIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        {!isLoading && !isError && !users?.length && (
          <Box p={3}>
            <Typography variant="body2" color="text.secondary">
              No users yet.
            </Typography>
          </Box>
        )}
      </Card>

      <CreateUserDialog open={createOpen} onClose={() => setCreateOpen(false)} managers={activeManagers} />
      {editTarget && (
        <EditUserDialog user={editTarget} onClose={() => setEditTarget(null)} managers={activeManagers} />
      )}
    </Stack>
  );
}
