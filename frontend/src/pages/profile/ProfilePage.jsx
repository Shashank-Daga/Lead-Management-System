import { useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Stack,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
} from "@mui/material";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import LockResetOutlinedIcon from "@mui/icons-material/LockResetOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import { useSnackbar } from "notistack";

import {
  useGetProfileQuery,
  useUpdateProfileMutation,
  useChangePasswordMutation,
} from "../../api/apiSlice";
import { credentialsReceived } from "../../features/auth/authSlice";

function PasswordField(props) {
  const [visible, setVisible] = useState(false);
  return (
    <TextField
      {...props}
      type={visible ? "text" : "password"}
      InputProps={{
        endAdornment: (
          <InputAdornment position="end">
            <IconButton
              type="button"
              edge="end"
              aria-label={visible ? "Hide password" : "Show password"}
              onClick={() => setVisible((v) => !v)}
              onMouseDown={(event) => event.preventDefault()}
            >
              {visible ? <VisibilityOffOutlinedIcon /> : <VisibilityOutlinedIcon />}
            </IconButton>
          </InputAdornment>
        ),
      }}
    />
  );
}

function SectionCard({ icon, title, description, children }) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 3, minWidth: 0 }}>
      <CardContent
        sx={{
          p: { xs: 2, sm: 3 },
          "&:last-child": { pb: { xs: 2, sm: 3 } },
        }}
      >
        <Stack
          direction="row"
          spacing={1.5}
          alignItems="flex-start"
          sx={{ mb: 2.5 }}
        >
          <Avatar
            sx={{
              bgcolor: "primary.50",
              color: "primary.main",
              width: 42,
              height: 42,
            }}
          >
            {icon}
          </Avatar>

          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 750 }}>
              {title}
            </Typography>

            {description && (
              <Typography variant="body2" color="text.secondary">
                {description}
              </Typography>
            )}
          </Box>
        </Stack>

        {children}
      </CardContent>
    </Card>
  );
}

function displayName(profile) {
  return profile?.fullName || "User";
}

function initials(name) {
  return String(name || "U")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] || "")
    .join("")
    .toUpperCase();
}

function roleLabel(profile) {
  return profile?.roleName || profile?.roleKey || "User";
}

export default function ProfilePage() {
  const dispatch = useDispatch();
  const { enqueueSnackbar } = useSnackbar();

  const {
    data: profile,
    isLoading,
    isError,
    error,
    refetch,
  } = useGetProfileQuery();

  const [updateProfile, updateState] = useUpdateProfileMutation();
  const [changePassword, passwordState] = useChangePasswordMutation();

  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    if (profile) {
      setPhone(profile.phone || "");
      setDateOfBirth(profile.dateOfBirth || "");
    }
  }, [profile]);

  const maxBirthDate = useMemo(
    () => new Date().toISOString().slice(0, 10),
    []
  );

  const profileError = updateState.error?.data?.message;
  const serverPasswordError = passwordState.error?.data?.message;

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    setPhoneError("");

    const trimmedPhone = phone.trim();
    if (trimmedPhone && !/^[0-9]{10}$/.test(trimmedPhone)) {
      setPhoneError("Phone number must be exactly 10 digits.");
      return;
    }

    if (dateOfBirth && dateOfBirth > maxBirthDate) {
      enqueueSnackbar("Date of birth cannot be in the future.", {
        variant: "error",
      });
      return;
    }

    try {
      await updateProfile({
        phone: trimmedPhone || null,
        dateOfBirth: dateOfBirth || null,
      }).unwrap();

      enqueueSnackbar("Profile updated successfully.", {
        variant: "success",
      });

      refetch();
    } catch (err) {
      enqueueSnackbar(
        err?.data?.message || "Could not update profile.",
        { variant: "error" }
      );
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    setPasswordError("");

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    if (newPassword === currentPassword) {
      setPasswordError(
        "New password must be different from the current password."
      );
      return;
    }

    try {
      const credentials = await changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      }).unwrap();

      dispatch(credentialsReceived(credentials));

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      enqueueSnackbar(
        "Password changed. Your current session has been refreshed.",
        { variant: "success" }
      );
    } catch (err) {
      setPasswordError(
        err?.data?.message || "Could not change password."
      );
    }
  };

  if (isLoading) {
    return (
      <Box
        sx={{
          minHeight: "45vh",
          display: "grid",
          placeItems: "center",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (isError || !profile) {
    return (
      <Stack spacing={2}>
        <Alert severity="error">
          {error?.data?.message || "Unable to load your profile."}
        </Alert>

        <Box>
          <Button onClick={() => refetch()} variant="outlined">
            Try again
          </Button>
        </Box>
      </Stack>
    );
  }

  return (
    <Stack
      spacing={3}
      sx={{ width: "100%", maxWidth: 1100, mx: "auto" }}
    >
      <Box>
        <Typography
          variant="h4"
          sx={{ fontWeight: 800, letterSpacing: -0.7 }}
        >
          My profile
        </Typography>

        <Typography color="text.secondary" sx={{ mt: 0.5 }}>
          Manage your contact details and account security.
        </Typography>
      </Box>

      <Card
        sx={{
          borderRadius: 3,
          color: "common.white",
          background:
            "linear-gradient(120deg, #1E1B4B 0%, #3730A3 100%)",
        }}
      >
        <CardContent
          sx={{
            p: { xs: 2.5, sm: 3.5 },
            "&:last-child": {
              pb: { xs: 2.5, sm: 3.5 },
            },
          }}
        >
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2.5}
            alignItems={{ xs: "flex-start", sm: "center" }}
          >
            <Avatar
              sx={{
                width: 76,
                height: 76,
                bgcolor: "rgba(255,255,255,0.18)",
                fontSize: "1.625rem",
                fontWeight: 750,
              }}
            >
              {initials(profile.fullName)}
            </Avatar>

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="h5"
                sx={{ fontWeight: 800, overflowWrap: "anywhere" }}
              >
                {displayName(profile)}
              </Typography>

              <Typography sx={{ opacity: 0.85, overflowWrap: "anywhere" }}>
                {profile.email}
              </Typography>

              <Stack
                direction="row"
                spacing={1}
                sx={{ mt: 1.5 }}
                useFlexGap
                flexWrap="wrap"
              >
                <Chip
                  label={roleLabel(profile)}
                  size="small"
                  sx={{
                    color: "white",
                    bgcolor: "rgba(255,255,255,0.16)",
                  }}
                />

                <Chip
                  label={
                    profile.isActive
                      ? "Active account"
                      : "Inactive account"
                  }
                  size="small"
                  sx={{
                    color: "white",
                    bgcolor: "rgba(255,255,255,0.16)",
                  }}
                />
              </Stack>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            lg: "minmax(0, 1.15fr) minmax(0, 0.85fr)",
          },
          gap: 3,
          alignItems: "start",
        }}
      >
        <SectionCard
          icon={<PersonOutlineOutlinedIcon />}
          title="Personal information"
          description={
            <>
              Your name, work email and role are managed by your administrator.
              <br />
              You can update your contact details.
            </>
          }
        >
          <Stack
            component="form"
            spacing={2.2}
            onSubmit={handleProfileSubmit}
          >
            <TextField
              label="Full name"
              value={profile.fullName || ""}
              fullWidth
              disabled
            />

            <TextField
              label="Work email"
              type="email"
              value={profile.email || ""}
              fullWidth
              disabled
            />

            <TextField
              label="Role"
              value={roleLabel(profile)}
              fullWidth
              disabled
            />

            <TextField
              label="Phone number"
              value={phone}
              onChange={(event) => {
                setPhoneError("");
                // Digits only, at most 10.
                setPhone(event.target.value.replace(/\D/g, "").slice(0, 10));
              }}
              placeholder="9876543210"
              inputProps={{ maxLength: 10, inputMode: "numeric" }}
              error={Boolean(phoneError)}
              helperText={phoneError || "10-digit mobile number."}
              fullWidth
            />

            <TextField
              label="Date of birth"
              type="date"
              value={dateOfBirth}
              onChange={(event) => setDateOfBirth(event.target.value)}
              InputLabelProps={{ shrink: true }}
              inputProps={{ max: maxBirthDate }}
              fullWidth
            />

            {profileError && (
              <Alert severity="error">{profileError}</Alert>
            )}

            <Box>
              <Button
                type="submit"
                variant="contained"
                startIcon={
                  updateState.isLoading ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <SaveOutlinedIcon />
                  )
                }
                disabled={updateState.isLoading}
              >
                {updateState.isLoading ? "Saving…" : "Save changes"}
              </Button>
            </Box>
          </Stack>
        </SectionCard>

        <SectionCard
          icon={<LockResetOutlinedIcon />}
          title="Change password"
          description="Use your current password to set a new password. Other sessions will need to sign in again."
        >
          <Stack
            component="form"
            spacing={2.2}
            onSubmit={handlePasswordSubmit}
          >
            <PasswordField
              label="Current password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              autoComplete="current-password"
              required
              fullWidth
            />

            <PasswordField
              label="New password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              autoComplete="new-password"
              helperText="Use at least 8 characters."
              inputProps={{ minLength: 8, maxLength: 128 }}
              required
              fullWidth
            />

            <PasswordField
              label="Confirm new password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              inputProps={{ maxLength: 128 }}
              required
              fullWidth
            />

            {(passwordError || serverPasswordError) && (
              <Alert severity="error">
                {passwordError || serverPasswordError}
              </Alert>
            )}

            <Box>
              <Button
                type="submit"
                variant="contained"
                disabled={passwordState.isLoading}
                startIcon={
                  passwordState.isLoading ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <LockResetOutlinedIcon />
                  )
                }
              >
                {passwordState.isLoading
                  ? "Updating…"
                  : "Update password"}
              </Button>
            </Box>
          </Stack>
        </SectionCard>
      </Box>
    </Stack>
  );
}
