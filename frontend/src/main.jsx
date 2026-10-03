import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { SnackbarProvider } from "notistack";
import { store } from "./app/store";
import theme from "./theme/theme";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <SnackbarProvider maxSnack={3} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
          <App />
        </SnackbarProvider>
      </ThemeProvider>
    </Provider>
  </React.StrictMode>
);
