import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/auth/LoginPage";
import DashboardPage from "./pages/dashboard/DashboardPage";
import LeadsListPage from "./pages/leads/LeadsListPage";
import LeadDetailPage from "./pages/leads/LeadDetailPage";
import UsersPage from "./pages/users/UsersPage";
import AppLayout from "./components/layout/AppLayout";
import ProtectedRoute from "./routes/ProtectedRoute";
import RequirePermission from "./routes/RequirePermission";
import { PERMISSIONS } from "./config/permissions";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/leads" element={<LeadsListPage />} />
            <Route path="/leads/:leadId" element={<LeadDetailPage />} />

            <Route element={<RequirePermission permission={PERMISSIONS.USER_MANAGE} />}>
              <Route path="/users" element={<UsersPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
