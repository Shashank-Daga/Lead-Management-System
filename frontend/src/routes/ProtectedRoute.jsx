import { useEffect } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Box, CircularProgress } from "@mui/material";
import { useGetMeQuery } from "../api/apiSlice";
import { currentUserLoaded, selectIsAuthenticated, selectCurrentUser } from "../features/auth/authSlice";

export default function ProtectedRoute() {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const currentUser = useSelector(selectCurrentUser);
  const dispatch = useDispatch();

  // Skip the /auth/me fetch entirely when there's no token — avoids a flash
  // of a loading spinner before bouncing straight to /login.
  const { data, isLoading } = useGetMeQuery(undefined, { skip: !isAuthenticated });

  useEffect(() => {
    if (data) dispatch(currentUserLoaded(data));
  }, [data, dispatch]);

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (isLoading || (!currentUser && isAuthenticated)) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" height="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return <Outlet />;
}
