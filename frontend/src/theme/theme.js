import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "light",

    primary: {
      main: "#3730A3",
      light: "#6366F1",
      dark: "#1E1B4B",
      contrastText: "#FFFFFF",
    },

    secondary: {
      main: "#D97706",
      light: "#F59E0B",
      dark: "#92400E",
      contrastText: "#FFFFFF",
    },

    success: {
      main: "#15803D",
      light: "#22C55E",
      dark: "#166534",
      contrastText: "#FFFFFF",
    },

    warning: {
      main: "#B45309",
      light: "#F59E0B",
      dark: "#92400E",
      contrastText: "#FFFFFF",
    },

    error: {
      main: "#B91C1C",
      light: "#EF4444",
      dark: "#991B1B",
      contrastText: "#FFFFFF",
    },

    info: {
      main: "#0891B2",
      light: "#22D3EE",
      dark: "#0E7490",
      contrastText: "#FFFFFF",
    },

    background: {
      default: "#F5F6FA",
      paper: "#FFFFFF",
    },

    text: {
      primary: "#1F2333",
      secondary: "#5A5F73",
      disabled: "#8B90A3",
    },

    divider: "#E4E7EF",

    action: {
      hover: "rgba(55, 48, 163, 0.05)",
      selected: "rgba(55, 48, 163, 0.08)",
      focus: "rgba(55, 48, 163, 0.12)",
    },
  },

  shape: {
    borderRadius: 10,
  },

  typography: {
    fontFamily:
      "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",

    h1: {
      fontWeight: 800,
      letterSpacing: "-0.03em",
    },

    h2: {
      fontWeight: 800,
      letterSpacing: "-0.025em",
    },

    h3: {
      fontWeight: 750,
      letterSpacing: "-0.02em",
    },

    h4: {
      fontWeight: 750,
      letterSpacing: "-0.02em",
    },

    h5: {
      fontWeight: 750,
      letterSpacing: "-0.015em",
    },

    h6: {
      fontWeight: 700,
      letterSpacing: "-0.01em",
    },

    subtitle1: {
      fontWeight: 600,
    },

    subtitle2: {
      fontWeight: 600,
    },

    body1: {
      lineHeight: 1.55,
    },

    body2: {
      lineHeight: 1.5,
    },

    button: {
      textTransform: "none",
      fontWeight: 650,
      letterSpacing: 0,
    },
  },

  components: {
    MuiCssBaseline: {
      styleOverrides: {
        html: {
          WebkitFontSmoothing: "antialiased",
          MozOsxFontSmoothing: "grayscale",
        },

        body: {
          margin: 0,
        },

        "*": {
          boxSizing: "border-box",
        },
      },
    },

    MuiPaper: {
      defaultProps: {
        elevation: 0,
      },

      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },

    MuiCard: {
      styleOverrides: {
        root: {
          borderColor: "#E4E7EF",
          boxShadow: "0 1px 2px rgba(15, 23, 42, 0.03)",
        },
      },
    },

    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },

      styleOverrides: {
        root: {
          minHeight: 40,
          borderRadius: 9,
          paddingInline: 16,
          textTransform: "none",
          fontWeight: 600,
        },

        sizeSmall: {
          minHeight: 36,
          paddingInline: 12,
        },
      },
    },

    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 9,
        },
      },
    },

    MuiTextField: {
      defaultProps: {
        variant: "outlined",
      },
    },

    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 9,
          backgroundColor: "#FFFFFF",

          transition:
            "border-color 160ms ease, box-shadow 160ms ease",

          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: "#A9AEC0",
          },

          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderWidth: 1,
          },
        },
      },
    },

    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontWeight: 500,
        },
      },
    },

    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 650,
          borderRadius: 7,
        },
      },
    },

    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 9,
        },
      },
    },

    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 14,
          backgroundImage: "none",
        },
      },
    },

    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontWeight: 750,
          paddingBottom: 8,
        },
      },
    },

    MuiDataGrid: {
      styleOverrides: {
        root: {
          borderColor: "#E4E7EF",

          "& .MuiDataGrid-columnHeaders": {
            backgroundColor: "#F8F9FC",
            borderBottomColor: "#E4E7EF",
          },

          "& .MuiDataGrid-columnHeaderTitle": {
            fontWeight: 700,
          },

          "& .MuiDataGrid-cell": {
            borderBottomColor: "#EEF0F5",
          },

          "& .MuiDataGrid-row:hover": {
            backgroundColor: "rgba(55, 48, 163, 0.025)",
          },
        },
      },
    },

    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          borderRadius: 7,
          fontSize: "0.75rem",
        },
      },
    },

    MuiButtonBase: {
      styleOverrides: {
        root: {
          "&:focus-visible": {
            outline: "3px solid rgba(79, 70, 229, 0.35)",
            outlineOffset: 2,
          },
        },
      },
    },
  },
});

export default theme;
