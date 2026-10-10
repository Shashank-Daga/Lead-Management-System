import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import {
  Alert,
  Box,
  Button,
  Card,
  CircularProgress,
  Divider,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  ArrowForwardRounded,
  CheckCircleOutlineRounded,
  VisibilityOffOutlined,
  VisibilityOutlined,
} from "@mui/icons-material";
import { useLoginMutation } from "../../api/apiSlice";
import { credentialsReceived } from "../../features/auth/authSlice";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

const benefits = [
  "Centralize and manage leads",
  "Track follow-ups and activities",
  "Monitor team performance",
];

export default function LoginPage() {
  const [login, { isLoading }] = useLoginMutation();
  const [serverError, setServerError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values) => {
    setServerError("");

    try {
      const result = await login(values).unwrap();

      dispatch(credentialsReceived(result));
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setServerError(
        err?.data?.message ||
          "Unable to sign in. Please check your credentials and try again."
      );
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        bgcolor: "background.default",
      }}
    >
      {/* Brand / Product Panel */}
      <Box
        sx={{
          display: { xs: "none", md: "flex" },
          flex: 1,
          position: "relative",
          overflow: "hidden",
          alignItems: "center",
          justifyContent: "center",
          p: 6,
          color: "common.white",
          background:
            "linear-gradient(145deg, #1E1B4B 0%, #312E81 48%, #4F46E5 100%)",
        }}
      >
        {/* Decorative shapes */}
        <Box
          sx={{
            position: "absolute",
            width: 420,
            height: 420,
            borderRadius: "50%",
            border: "1px solid rgba(255,255,255,0.10)",
            top: -180,
            right: -140,
          }}
        />

        <Box
          sx={{
            position: "absolute",
            width: 520,
            height: 520,
            borderRadius: "50%",
            border: "1px solid rgba(255,255,255,0.08)",
            bottom: -280,
            left: -220,
          }}
        />

        <Stack
          spacing={4}
          sx={{
            width: "100%",
            maxWidth: 520,
            position: "relative",
            zIndex: 1,
          }}
        >
          <Box>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box
                sx={{
                  width: 42,
                  height: 42,
                  borderRadius: 1.5,
                  display: "grid",
                  placeItems: "center",
                  bgcolor: "rgba(255,255,255,0.14)",
                  border: "1px solid rgba(255,255,255,0.18)",
                }}
              >
                <Typography fontWeight={800} fontSize={20}>
                  L
                </Typography>
              </Box>

              <Typography
                variant="h6"
                fontWeight={800}
                letterSpacing="-0.02em"
              >
                LeadFlow
              </Typography>
            </Stack>
          </Box>

          <Box>
            <Typography
              sx={{
                fontSize: { md: "2.5rem", lg: "3rem" },
                lineHeight: 1.12,
                fontWeight: 800,
                letterSpacing: "-0.04em",
                maxWidth: 500,
              }}
            >
              Turn every lead into an opportunity.
            </Typography>

            <Typography
              sx={{
                mt: 2,
                maxWidth: 440,
                color: "rgba(255,255,255,0.72)",
                lineHeight: 1.7,
                fontSize: 16,
              }}
            >
              A centralized workspace for managing leads, follow-ups,
              activities, and your sales team.
            </Typography>
          </Box>

          <Stack spacing={1.75}>
            {benefits.map((benefit) => (
              <Stack
                key={benefit}
                direction="row"
                spacing={1.25}
                alignItems="center"
              >
                <CheckCircleOutlineRounded
                  sx={{
                    fontSize: 20,
                    color: "rgba(255,255,255,0.9)",
                  }}
                />

                <Typography
                  variant="body2"
                  sx={{ color: "rgba(255,255,255,0.82)" }}
                >
                  {benefit}
                </Typography>
              </Stack>
            ))}
          </Stack>

          <Typography
            variant="caption"
            sx={{
              color: "rgba(255,255,255,0.48)",
              pt: 2,
            }}
          >
            Secure workspace for your sales operations
          </Typography>
        </Stack>
      </Box>

      {/* Login Panel */}
      <Box
        sx={{
          width: { xs: "100%", md: "48%", lg: 560 },
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          px: { xs: 2, sm: 4, md: 6 },
          py: { xs: 4, md: 6 },
          bgcolor: "background.paper",
        }}
      >
        <Card
          elevation={0}
          sx={{
            width: "100%",
            maxWidth: 420,
            border: "none",
            bgcolor: "transparent",
          }}
        >
          {/* Mobile brand */}
          <Box
            sx={{
              display: { xs: "block", md: "none" },
              mb: 5,
            }}
          >
            <Stack direction="row" spacing={1.25} alignItems="center">
              <Box
                sx={{
                  width: 38,
                  height: 38,
                  borderRadius: 1.5,
                  display: "grid",
                  placeItems: "center",
                  bgcolor: "primary.main",
                  color: "primary.contrastText",
                }}
              >
                <Typography fontWeight={800} fontSize={18}>
                  L
                </Typography>
              </Box>

              <Typography
                variant="h6"
                fontWeight={800}
                color="text.primary"
              >
                LeadFlow
              </Typography>
            </Stack>
          </Box>

          <Stack spacing={0.75} mb={4}>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 800,
                letterSpacing: "-0.035em",
                fontSize: { xs: "1.9rem", sm: "2.1rem" },
              }}
            >
              Welcome back
            </Typography>

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontSize: 15 }}
            >
              Sign in to continue to your lead management workspace.
            </Typography>
          </Stack>

          <Divider sx={{ mb: 3.5 }} />

          <Box
            component="form"
            onSubmit={handleSubmit(onSubmit)}
            noValidate
          >
            <Stack spacing={2.25}>
              {serverError && (
                <Alert
                  severity="error"
                  variant="outlined"
                  onClose={() => setServerError("")}
                  sx={{
                    borderRadius: 1.5,
                    alignItems: "center",
                  }}
                >
                  {serverError}
                </Alert>
              )}

              <TextField
                label="Email address"
                type="email"
                fullWidth
                autoFocus
                autoComplete="email"
                placeholder="you@example.com"
                {...register("email")}
                error={Boolean(errors.email)}
                helperText={errors.email?.message}
                disabled={isLoading}
              />

              <TextField
                label="Password"
                type={showPassword ? "text" : "password"}
                fullWidth
                autoComplete="current-password"
                {...register("password")}
                error={Boolean(errors.password)}
                helperText={errors.password?.message}
                disabled={isLoading}
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          type="button"
                          edge="end"
                          aria-label={
                            showPassword
                              ? "Hide password"
                              : "Show password"
                          }
                          onClick={() =>
                            setShowPassword((current) => !current)
                          }
                          disabled={isLoading}
                        >
                          {showPassword ? (
                            <VisibilityOffOutlined />
                          ) : (
                            <VisibilityOutlined />
                          )}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />

              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={isLoading}
                endIcon={
                  !isLoading ? <ArrowForwardRounded /> : undefined
                }
                sx={{
                  mt: 0.5,
                  minHeight: 50,
                  fontSize: 15,
                  fontWeight: 700,
                  borderRadius: 1.5,
                  boxShadow: "none",
                  "&:hover": {
                    boxShadow: "0 6px 18px rgba(55, 48, 163, 0.20)",
                  },
                }}
              >
                {isLoading ? (
                  <>
                    <CircularProgress
                      size={21}
                      color="inherit"
                      sx={{ mr: 1.25 }}
                    />
                    Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>
            </Stack>
          </Box>

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              display: "block",
              textAlign: "center",
              mt: 4,
              lineHeight: 1.6,
            }}
          >
            Access is managed by your LeadFlow administrator.
          </Typography>
        </Card>
      </Box>
    </Box>
  );
}
