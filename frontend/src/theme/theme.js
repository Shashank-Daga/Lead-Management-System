import { createTheme } from "@mui/material/styles";

// A CRM needs to be scannable at a glance — this palette leans on a deep
// indigo primary (trust, "enterprise software") with a warm amber accent
// reserved for priority/attention cues, rather than MUI's default blue/purple.
const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#3730A3", light: "#6366F1", dark: "#1E1B4B", contrastText: "#fff" },
    secondary: { main: "#D97706" },
    success: { main: "#15803D" },
    warning: { main: "#B45309" },
    error: { main: "#B91C1C" },
    background: { default: "#F4F5F9", paper: "#FFFFFF" },
    text: { primary: "#1F2333", secondary: "#5A5F73" },
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    h1: { fontWeight: 700 },
    h2: { fontWeight: 700 },
    h6: { fontWeight: 600 },
    button: { textTransform: "none", fontWeight: 600 },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: "none" },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 8 },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600 },
      },
    },
  },
});

export default theme;
