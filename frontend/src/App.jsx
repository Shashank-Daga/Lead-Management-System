import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Box, CircularProgress } from "@mui/material";

import AppLayout from "./components/layout/AppLayout";
import ProtectedRoute from "./routes/ProtectedRoute";
import RequirePermission from "./routes/RequirePermission";
import { PERMISSIONS } from "./config/permissions";

const LoginPage = lazy(() => import("./pages/auth/LoginPage"));
const DashboardPage = lazy(() => import("./pages/dashboard/DashboardPage"));
const LeadsListPage = lazy(() => import("./pages/leads/LeadsListPage"));
const LeadDetailPage = lazy(() => import("./pages/leads/LeadDetailPage"));
const UsersPage = lazy(() => import("./pages/users/UsersPage"));

function PageLoader() {
  return (
    <Box
      sx={{
        minHeight: "60vh",
        display: "grid",
        placeItems: "center",
      }}
    >
      <CircularProgress size={30} />
    </Box>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />

              <Route path="/leads" element={<LeadsListPage />} />

              <Route
                path="/leads/:leadId"
                element={<LeadDetailPage />}
              />

              <Route
                element={
                  <RequirePermission
                    permission={PERMISSIONS.USER_MANAGE}
                  />
                }
              >
                <Route path="/users" element={<UsersPage />} />
              </Route>
            </Route>
          </Route>

          <Route
            path="/"
            element={<Navigate to="/dashboard" replace />}
          />

          <Route
            path="*"
            element={<Navigate to="/dashboard" replace />}
          />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
