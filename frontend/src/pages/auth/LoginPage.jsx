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
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useLoginMutation } from "../../api/apiSlice";
import { credentialsReceived } from "../../features/auth/authSlice";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export default function LoginPage() {
  const [login, { isLoading }] = useLoginMutation();
  const [serverError, setServerError] = useState("");
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema), defaultValues: { email: "", password: "" } });

  const onSubmit = async (values) => {
    setServerError("");
    try {
      const result = await login(values).unwrap();
      dispatch(credentialsReceived(result));
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setServerError(err?.data?.message || "Unable to sign in. Check your credentials.");
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #1E1B4B 0%, #3730A3 60%, #6366F1 100%)",
        p: 2,
      }}
    >
      <Card sx={{ width: 400, p: 4, borderRadius: 3 }} elevation={8}>
        <Stack spacing={0.5} mb={3}>
          <Typography variant="h5" fontWeight={700}>
            LeadFlow
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Sign in to manage your leads
          </Typography>
        </Stack>

        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <Stack spacing={2.5}>
            {serverError && <Alert severity="error">{serverError}</Alert>}

            <TextField
              label="Email"
              type="email"
              fullWidth
              autoFocus
              {...register("email")}
              error={Boolean(errors.email)}
              helperText={errors.email?.message}
            />
            <TextField
              label="Password"
              type="password"
              fullWidth
              {...register("password")}
              error={Boolean(errors.password)}
              helperText={errors.password?.message}
            />
            <Button
              type="submit"
              variant="contained"
              size="large"
              fullWidth
              disabled={isLoading}
              sx={{ py: 1.25 }}
            >
              {isLoading ? <CircularProgress size={22} color="inherit" /> : "Sign in"}
            </Button>
          </Stack>
        </Box>
      </Card>
    </Box>
  );
}
