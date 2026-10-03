import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  user: null, // { id, fullName, email, roleKey, permissions: [] }
  isAuthenticated: Boolean(localStorage.getItem("lms_access_token")),
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    credentialsReceived(state, action) {
      const { accessToken, refreshToken } = action.payload;
      localStorage.setItem("lms_access_token", accessToken);
      localStorage.setItem("lms_refresh_token", refreshToken);
      state.isAuthenticated = true;
    },
    currentUserLoaded(state, action) {
      state.user = action.payload;
    },
    loggedOut(state) {
      localStorage.removeItem("lms_access_token");
      localStorage.removeItem("lms_refresh_token");
      state.user = null;
      state.isAuthenticated = false;
    },
  },
});

export const { credentialsReceived, currentUserLoaded, loggedOut } = authSlice.actions;
export default authSlice.reducer;

// Selectors
export const selectCurrentUser = (state) => state.auth.user;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectHasPermission = (permissionKey) => (state) =>
  Boolean(state.auth.user?.permissions?.includes(permissionKey));
