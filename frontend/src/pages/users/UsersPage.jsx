import { useEffect, useMemo, useState } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import {
  Alert,
  Avatar,
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
  FormControlLabel,
  IconButton,
  MenuItem,
  Skeleton,
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
  useMediaQuery,
  useTheme,
} from "@mui/material";

import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import PeopleOutlineRoundedIcon from "@mui/icons-material/PeopleOutlineRounded";
import ManageAccountsOutlinedIcon from "@mui/icons-material/ManageAccountsOutlined";
import PersonOffOutlinedIcon from "@mui/icons-material/PersonOffOutlined";

import { useSnackbar } from "notistack";

import {
  useCreateUserMutation,
  useListUsersQuery,
  useUpdateUserMutation,
} from "../../api/apiSlice";


const ROLES = [
  {
    key: "ADMIN",
    label: "Admin",
  },
  {
    key: "MANAGER",
    label: "Manager",
  },
  {
    key: "EXECUTIVE",
    label: "Executive",
  },
];


function getInitials(fullName = "") {
  return fullName
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}


/**
 * Manager dropdown shared by create and edit dialogs.
 * Only active managers are offered. The backend independently
 * validates the selected manager.
 */
function ManagerSelect({
  control,
  errors,
  managers,
}) {
  return (
    <Controller
      name="managerId"
      control={control}
      render={({ field }) => (
        <TextField
          select
          label="Manager"
          fullWidth
          {...field}
          error={Boolean(errors.managerId)}
          helperText={
            errors.managerId?.message ||
            (managers.length === 0
              ? "No active managers available — create a Manager first."
              : "")
          }
        >
          {managers.map((manager) => (
            <MenuItem
              key={manager.id}
              value={manager.id}
            >
              {manager.fullName}
            </MenuItem>
          ))}
        </TextField>
      )}
    />
  );
}


// An Executive must have a manager.
// Admin/Manager must not.
const baseFields = {
  fullName: z
    .string()
    .min(1, "Required")
    .max(150),

  roleKey: z.enum([
    "ADMIN",
    "MANAGER",
    "EXECUTIVE",
  ]),

  managerId: z.string().optional(),
};


function requireManagerForExecutive(
  data,
  ctx
) {
  if (
    data.roleKey === "EXECUTIVE" &&
    !data.managerId
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["managerId"],
      message: "Select a manager",
    });
  }
}


const createSchema = z
  .object({
    ...baseFields,
    email: z
      .string()
      .email("Enter a valid email"),
    password: z
      .string()
      .min(8, "At least 8 characters"),
  })
  .superRefine(
    requireManagerForExecutive
  );


const editSchema = z
  .object({
    ...baseFields,
    isActive: z.boolean(),
  })
  .superRefine(
    requireManagerForExecutive
  );


function DialogSection({
  title,
  children,
}) {
  return (
    <Box>
      <Typography
        variant="caption"
        color="text.secondary"
        fontWeight={700}
        sx={{
          display: "block",
          mb: 1,
          letterSpacing: 0.3,
        }}
      >
        {title}
      </Typography>

      {children}
    </Box>
  );
}


function CreateUserDialog({
  open,
  onClose,
  managers,
}) {
  const [
    createUser,
    { isLoading },
  ] = useCreateUserMutation();

  const { enqueueSnackbar } =
    useSnackbar();

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(
      createSchema
    ),

    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      roleKey: "EXECUTIVE",
      managerId: "",
    },
  });

  const roleKey = useWatch({
    control,
    name: "roleKey",
  });


  useEffect(() => {
    if (roleKey !== "EXECUTIVE") {
      setValue("managerId", "");
    }
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

      ...(values.roleKey === "EXECUTIVE"
        ? {
            managerId:
              values.managerId,
          }
        : {}),
    };


    try {
      await createUser(payload).unwrap();

      enqueueSnackbar(
        "User created",
        {
          variant: "success",
        }
      );

      handleClose();
    } catch (err) {
      enqueueSnackbar(
        err?.data?.message ||
          "Could not create user",
        {
          variant: "error",
        }
      );
    }
  };


  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle
        sx={{
          fontWeight: 750,
        }}
      >
        Create new user
      </DialogTitle>

      <DialogContent>
        <Stack
          spacing={2.5}
          sx={{ mt: 1 }}
        >
          <DialogSection title="Account details">
            <Stack spacing={2}>
              <TextField
                label="Full Name"
                fullWidth
                {...register("fullName")}
                error={Boolean(
                  errors.fullName
                )}
                helperText={
                  errors.fullName?.message
                }
              />

              <TextField
                label="Email"
                type="email"
                fullWidth
                {...register("email")}
                error={Boolean(
                  errors.email
                )}
                helperText={
                  errors.email?.message
                }
              />

              <TextField
                label="Temporary Password"
                type="password"
                fullWidth
                {...register("password")}
                error={Boolean(
                  errors.password
                )}
                helperText={
                  errors.password?.message
                }
              />
            </Stack>
          </DialogSection>


          <DialogSection title="Access & hierarchy">
            <Stack spacing={2}>
              <Controller
                name="roleKey"
                control={control}
                render={({ field }) => (
                  <TextField
                    select
                    label="Role"
                    fullWidth
                    {...field}
                  >
                    {ROLES.map((role) => (
                      <MenuItem
                        key={role.key}
                        value={role.key}
                      >
                        {role.label}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />

              {roleKey === "EXECUTIVE" && (
                <ManagerSelect
                  control={control}
                  errors={errors}
                  managers={managers}
                />
              )}
            </Stack>
          </DialogSection>
        </Stack>
      </DialogContent>


      <DialogActions
        sx={{
          px: 3,
          pb: 2,
        }}
      >
        <Button
          onClick={handleClose}
          disabled={isLoading}
        >
          Cancel
        </Button>

        <Button
          variant="contained"
          onClick={handleSubmit(onSubmit)}
          disabled={isLoading}
        >
          {isLoading
            ? "Creating…"
            : "Create user"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}


function EditUserDialog({
  user,
  onClose,
  managers,
}) {
  const [
    updateUser,
    { isLoading },
  ] = useUpdateUserMutation();

  const { enqueueSnackbar } =
    useSnackbar();


  const defaults = useMemo(
    () => ({
      fullName: user.fullName,
      roleKey: user.role.key,
      managerId:
        user.manager?.id || "",
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
  } = useForm({
    resolver: zodResolver(editSchema),
    defaultValues: defaults,
  });


  const roleKey = useWatch({
    control,
    name: "roleKey",
  });


  useEffect(() => {
    if (roleKey !== "EXECUTIVE") {
      setValue("managerId", "");
    }
  }, [roleKey, setValue]);


  // Keep the currently assigned manager selectable
  // even if they were subsequently deactivated.
  const options = useMemo(() => {
    const current =
      user.manager &&
      !managers.some(
        (manager) =>
          manager.id === user.manager.id
      );

    return current
      ? [
          ...managers,
          {
            ...user.manager,
          },
        ]
      : managers;
  }, [managers, user]);


  const onSubmit = async (values) => {
    try {
      await updateUser({
        userId: user.id,
        fullName: values.fullName,
        roleKey: values.roleKey,
        managerId:
          values.roleKey === "EXECUTIVE"
            ? values.managerId
            : null,
        isActive: values.isActive,
      }).unwrap();

      enqueueSnackbar(
        "User updated",
        {
          variant: "success",
        }
      );

      onClose();
    } catch (err) {
      enqueueSnackbar(
        err?.data?.message ||
          "Could not update user",
        {
          variant: "error",
        }
      );
    }
  };


  return (
    <Dialog
      open
      onClose={onClose}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle
        sx={{
          fontWeight: 750,
        }}
      >
        Edit user
      </DialogTitle>

      <DialogContent>
        <Stack
          spacing={2.5}
          sx={{ mt: 1 }}
        >
          <DialogSection title="Account">
            <Stack spacing={2}>
              <TextField
                label="Email"
                value={user.email}
                disabled
                fullWidth
              />

              <TextField
                label="Full Name"
                fullWidth
                {...register("fullName")}
                error={Boolean(
                  errors.fullName
                )}
                helperText={
                  errors.fullName?.message
                }
              />
            </Stack>
          </DialogSection>


          <DialogSection title="Access & hierarchy">
            <Stack spacing={2}>
              <Controller
                name="roleKey"
                control={control}
                render={({ field }) => (
                  <TextField
                    select
                    label="Role"
                    fullWidth
                    {...field}
                  >
                    {ROLES.map((role) => (
                      <MenuItem
                        key={role.key}
                        value={role.key}
                      >
                        {role.label}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />

              {roleKey === "EXECUTIVE" && (
                <ManagerSelect
                  control={control}
                  errors={errors}
                  managers={options}
                />
              )}


              <Controller
                name="isActive"
                control={control}
                render={({ field }) => (
                  <Box
                    sx={{
                      px: 1.5,
                      py: 1,
                      borderRadius: 2,
                      bgcolor: "action.hover",
                    }}
                  >
                    <FormControlLabel
                      control={
                        <Switch
                          checked={field.value}
                          onChange={(event) =>
                            field.onChange(
                              event.target.checked
                            )
                          }
                        />
                      }
                      label={
                        <Box>
                          <Typography
                            variant="body2"
                            fontWeight={600}
                          >
                            Active account
                          </Typography>

                          <Typography
                            variant="caption"
                            color="text.secondary"
                          >
                            Inactive users cannot
                            be treated as active
                            team members.
                          </Typography>
                        </Box>
                      }
                    />
                  </Box>
                )}
              />
            </Stack>
          </DialogSection>
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
          onClick={handleSubmit(onSubmit)}
          disabled={isLoading}
        >
          {isLoading
            ? "Saving…"
            : "Save changes"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}


function UserCard({
  user,
  onEdit,
}) {
  return (
    <Card
      variant="outlined"
      elevation={0}
      sx={{
        borderRadius: 2.5,
        transition:
          "border-color 0.2s ease",
        "&:hover": {
          borderColor: "primary.main",
        },
      }}
    >
      <Box sx={{ p: 2 }}>
        <Stack spacing={1.75}>

          <Stack
            direction="row"
            spacing={1.25}
            alignItems="center"
          >
            <Avatar
              sx={{
                width: 40,
                height: 40,
                fontSize: 13,
                fontWeight: 700,
                bgcolor: "primary.main",
              }}
            >
              {getInitials(user.fullName)}
            </Avatar>

            <Box
              flex={1}
              minWidth={0}
            >
              <Typography
                variant="subtitle2"
                fontWeight={700}
                noWrap
              >
                {user.fullName}
              </Typography>

              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  display: "block",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {user.email}
              </Typography>
            </Box>

            <IconButton
              size="small"
              onClick={() => onEdit(user)}
              aria-label={`Edit ${user.fullName}`}
            >
              <EditOutlinedIcon fontSize="small" />
            </IconButton>
          </Stack>


          <Divider />


          <Stack
            direction="row"
            flexWrap="wrap"
            gap={0.75}
          >
            <Chip
              size="small"
              label={user.role.name}
              icon={
                user.role.key === "ADMIN" ? (
                  <ManageAccountsOutlinedIcon />
                ) : undefined
              }
            />

            <Chip
              size="small"
              variant="outlined"
              color={
                user.isActive
                  ? "success"
                  : "default"
              }
              label={
                user.isActive
                  ? "Active"
                  : "Inactive"
              }
              icon={
                user.isActive ? undefined : (
                  <PersonOffOutlinedIcon />
                )
              }
            />
          </Stack>


          <Box>
            <Typography
              variant="caption"
              color="text.secondary"
              fontWeight={600}
            >
              Manager
            </Typography>

            <Typography
              variant="body2"
              sx={{ mt: 0.25 }}
            >
              {user.manager?.fullName ||
                "No manager assigned"}
            </Typography>
          </Box>

        </Stack>
      </Box>
    </Card>
  );
}


function UserTableSkeleton() {
  return (
    <Stack spacing={1.5} sx={{ p: 2 }}>
      {Array.from({ length: 5 }).map(
        (_, index) => (
          <Stack
            key={index}
            direction="row"
            spacing={2}
            alignItems="center"
          >
            <Skeleton
              variant="circular"
              width={36}
              height={36}
            />

            <Skeleton
              width="22%"
              height={24}
            />

            <Skeleton
              width="25%"
              height={24}
            />

            <Skeleton
              width="12%"
              height={24}
            />

            <Skeleton
              width="15%"
              height={24}
            />

            <Skeleton
              width="10%"
              height={24}
            />
          </Stack>
        )
      )}
    </Stack>
  );
}


export default function UsersPage() {
  const theme = useTheme();

  const isMobile = useMediaQuery(
    theme.breakpoints.down("sm")
  );

  const {
    data: users,
    isLoading,
    isError,
    error,
  } = useListUsersQuery();

  const [
    createOpen,
    setCreateOpen,
  ] = useState(false);

  const [
    editTarget,
    setEditTarget,
  ] = useState(null);


  const activeManagers = useMemo(
    () =>
      (users || []).filter(
        (user) =>
          user.role.key === "MANAGER" &&
          user.isActive
      ),
    [users]
  );


  const activeCount =
    users?.filter(
      (user) => user.isActive
    ).length || 0;

  const managerCount =
    users?.filter(
      (user) =>
        user.role.key === "MANAGER"
    ).length || 0;


  return (
    <Stack spacing={{ xs: 2, sm: 2.5 }}>

      {/* Page header */}
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
        spacing={1.5}
      >
        <Box>
          <Typography
            variant="h5"
            fontWeight={750}
          >
            Users
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 0.35 }}
          >
            Manage team members, roles and
            reporting relationships.
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<AddOutlinedIcon />}
          onClick={() =>
            setCreateOpen(true)
          }
          sx={{
            alignSelf: {
              xs: "stretch",
              sm: "auto",
            },
          }}
        >
          New user
        </Button>
      </Stack>


      {/* Summary */}
      {!isLoading &&
        !isError &&
        users?.length > 0 && (
          <Stack
            direction="row"
            flexWrap="wrap"
            gap={1}
          >
            <Chip
              icon={
                <PeopleOutlineRoundedIcon />
              }
              label={`${users.length} total`}
              variant="outlined"
            />

            <Chip
              label={`${activeCount} active`}
              color="success"
              variant="outlined"
            />

            <Chip
              label={`${managerCount} managers`}
              variant="outlined"
            />
          </Stack>
        )}


      {isError && (
        <Alert
          severity="error"
          sx={{ borderRadius: 2 }}
        >
          {error?.data?.message ||
            "Could not load users."}
        </Alert>
      )}


      {/* User list */}
      <Card
        elevation={0}
        variant="outlined"
        sx={{
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        {isLoading ? (
          isMobile ? (
            <Stack
              spacing={1.5}
              sx={{ p: 2 }}
            >
              {Array.from({
                length: 4,
              }).map((_, index) => (
                <Card
                  key={index}
                  variant="outlined"
                  sx={{
                    borderRadius: 2.5,
                    p: 2,
                  }}
                >
                  <Skeleton
                    width="50%"
                    height={24}
                  />
                  <Skeleton
                    width="75%"
                    height={20}
                  />
                  <Skeleton
                    width="45%"
                    height={20}
                  />
                </Card>
              ))}
            </Stack>
          ) : (
            <UserTableSkeleton />
          )
        ) : (
          <>
            {/* Mobile */}
            {isMobile ? (
              <Box sx={{ p: 1.5 }}>
                {!users?.length ? (
                  <Box
                    sx={{
                      p: 3,
                      textAlign: "center",
                    }}
                  >
                    <PeopleOutlineRoundedIcon
                      color="disabled"
                      sx={{
                        fontSize: 36,
                        mb: 1,
                      }}
                    />

                    <Typography
                      variant="body2"
                      fontWeight={600}
                    >
                      No users yet
                    </Typography>

                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        display: "block",
                        mt: 0.5,
                      }}
                    >
                      Create your first team
                      member to get started.
                    </Typography>
                  </Box>
                ) : (
                  <Stack spacing={1.25}>
                    {users.map((user) => (
                      <UserCard
                        key={user.id}
                        user={user}
                        onEdit={setEditTarget}
                      />
                    ))}
                  </Stack>
                )}
              </Box>
            ) : (
              /* Desktop / tablet */
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>
                        Name
                      </TableCell>

                      <TableCell>
                        Email
                      </TableCell>

                      <TableCell>
                        Role
                      </TableCell>

                      <TableCell>
                        Manager
                      </TableCell>

                      <TableCell>
                        Status
                      </TableCell>

                      <TableCell align="right">
                        Actions
                      </TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {users?.map((user) => (
                      <TableRow
                        key={user.id}
                        hover
                      >
                        <TableCell>
                          <Stack
                            direction="row"
                            spacing={1.25}
                            alignItems="center"
                          >
                            <Avatar
                              sx={{
                                width: 34,
                                height: 34,
                                fontSize: 12,
                                fontWeight: 700,
                                bgcolor:
                                  "primary.main",
                              }}
                            >
                              {getInitials(
                                user.fullName
                              )}
                            </Avatar>

                            <Typography
                              variant="body2"
                              fontWeight={600}
                            >
                              {user.fullName}
                            </Typography>
                          </Stack>
                        </TableCell>

                        <TableCell>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                          >
                            {user.email}
                          </Typography>
                        </TableCell>

                        <TableCell>
                          <Chip
                            size="small"
                            label={user.role.name}
                          />
                        </TableCell>

                        <TableCell>
                          {user.manager?.fullName ||
                            "—"}
                        </TableCell>

                        <TableCell>
                          <Chip
                            size="small"
                            variant="outlined"
                            color={
                              user.isActive
                                ? "success"
                                : "default"
                            }
                            label={
                              user.isActive
                                ? "Active"
                                : "Inactive"
                            }
                          />
                        </TableCell>

                        <TableCell align="right">
                          <IconButton
                            size="small"
                            onClick={() =>
                              setEditTarget(
                                user
                              )
                            }
                            aria-label={`Edit ${user.fullName}`}
                          >
                            <EditOutlinedIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}

                    {!users?.length && (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                        >
                          <Box
                            sx={{
                              p: 4,
                              textAlign:
                                "center",
                            }}
                          >
                            <Typography
                              variant="body2"
                              fontWeight={600}
                            >
                              No users yet
                            </Typography>

                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{
                                display:
                                  "block",
                                mt: 0.5,
                              }}
                            >
                              Create your first
                              team member to
                              get started.
                            </Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </>
        )}
      </Card>


      <CreateUserDialog
        open={createOpen}
        onClose={() =>
          setCreateOpen(false)
        }
        managers={activeManagers}
      />


      {editTarget && (
        <EditUserDialog
          user={editTarget}
          onClose={() =>
            setEditTarget(null)
          }
          managers={activeManagers}
        />
      )}
    </Stack>
  );
}
