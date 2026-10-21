import { alpha, createTheme, responsiveFontSizes } from "@mui/material/styles";

/**
 * Design tokens. Every colour used below derives from these constants so the
 * palette can be changed in one place. Contrast ratios are against white.
 */
const brand = {
  50: "#EEF0FF", // tint (avatars, drawer text)
  main: "#3730A3", // 9.9:1
  light: "#6366F1", // 4.5:1 (focus ring, hover accents)
  dark: "#1E1B4B",
};

const neutral = {
  background: "#F5F6FA",
  textPrimary: "#1F2333",
  textSecondary: "#5A5F73", // 6.4:1
  textDisabled: "#767B8F", // 4.2:1
  divider: "#E4E7EF",
  // Form-control borders must reach 3:1 (WCAG 1.4.11).
  controlBorder: "#8B90A3", // 3.2:1
  controlBorderHover: "#5A5F73", // 6.4:1
  tableHeader: "#F8F9FC",
  tableRule: "#EEF0F5",
};

const FONT_FAMILY =
  "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

let theme = createTheme({
  palette: {
    mode: "light",

    primary: { ...brand, contrastText: "#FFFFFF" },

    // Every main colour below gives >= 4.5:1 with white text.
    secondary: {
      main: "#B45309", // 5.0:1
      light: "#D97706",
      dark: "#92400E",
      contrastText: "#FFFFFF",
    },

    success: {
      main: "#15803D", // 5.0:1
      light: "#22C55E",
      dark: "#166534",
      contrastText: "#FFFFFF",
    },

    warning: {
      main: "#B45309", // 5.0:1
      light: "#F59E0B",
      dark: "#92400E",
      contrastText: "#FFFFFF",
    },

    error: {
      main: "#B91C1C", // 6.5:1
      light: "#EF4444",
      dark: "#991B1B",
      contrastText: "#FFFFFF",
    },

    info: {
      main: "#0E7490", // 5.4:1 (was #0891B2 at 3.7:1)
      light: "#06B6D4",
      dark: "#155E75",
      contrastText: "#FFFFFF",
    },

    background: {
      default: neutral.background,
      paper: "#FFFFFF",
    },

    text: {
      primary: neutral.textPrimary,
      secondary: neutral.textSecondary,
      disabled: neutral.textDisabled,
    },

    divider: neutral.divider,

    action: {
      hover: alpha(brand.main, 0.05),
      selected: alpha(brand.main, 0.08),
      focus: alpha(brand.main, 0.12),
    },
  },

  shape: {
    borderRadius: 10,
  },

  // Only weights that the Inter font request in index.html actually loads.
  typography: {
    fontFamily: FONT_FAMILY,
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 700,

    h1: { fontWeight: 800, letterSpacing: "-0.03em" },
    h2: { fontWeight: 800, letterSpacing: "-0.025em" },
    h3: { fontWeight: 700, letterSpacing: "-0.02em" },
    h4: { fontWeight: 700, letterSpacing: "-0.02em" },
    h5: { fontWeight: 700, letterSpacing: "-0.015em" },
    h6: { fontWeight: 700, letterSpacing: "-0.01em" },

    subtitle1: { fontWeight: 600 },
    subtitle2: { fontWeight: 600 },

    body1: { lineHeight: 1.55 },
    body2: { lineHeight: 1.5 },

    button: {
      textTransform: "none",
      fontWeight: 600,
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

        // Respect the OS "reduce motion" setting.
        "@media (prefers-reduced-motion: reduce)": {
          "*, *::before, *::after": {
            animationDuration: "0.01ms !important",
            animationIterationCount: "1 !important",
            transitionDuration: "0.01ms !important",
            scrollBehavior: "auto !important",
          },
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
        root: ({ theme: t }) => ({
          borderColor: t.palette.divider,
          boxShadow: `0 1px 2px ${alpha("#0F172A", 0.03)}`,
        }),
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
          // WCAG 2.5.5 / Apple HIG: 44px touch target on touch screens.
          "@media (pointer: coarse)": {
            minWidth: 44,
            minHeight: 44,
          },
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
        root: ({ theme: t }) => ({
          borderRadius: 9,
          backgroundColor: t.palette.background.paper,

          transition: t.transitions.create(["border-color", "box-shadow"], {
            duration: 160,
          }),

          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: neutral.controlBorder,
          },

          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: neutral.controlBorderHover,
          },

          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: t.palette.primary.main,
            borderWidth: 2,
          },

          "&.Mui-error .MuiOutlinedInput-notchedOutline": {
            borderColor: t.palette.error.main,
          },

          "&.Mui-disabled .MuiOutlinedInput-notchedOutline": {
            borderColor: t.palette.divider,
          },
        }),
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
          fontWeight: 600,
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
          fontWeight: 700,
          paddingBottom: 8,
        },
      },
    },

    MuiDataGrid: {
      styleOverrides: {
        root: ({ theme: t }) => ({
          borderColor: t.palette.divider,

          "& .MuiDataGrid-columnHeaders": {
            backgroundColor: neutral.tableHeader,
            borderBottomColor: t.palette.divider,
          },

          "& .MuiDataGrid-columnHeaderTitle": {
            fontWeight: 700,
          },

          "& .MuiDataGrid-cell": {
            borderBottomColor: neutral.tableRule,
          },

          "& .MuiDataGrid-row:hover": {
            backgroundColor: alpha(t.palette.primary.main, 0.025),
          },
        }),
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

    // Solid, high-contrast keyboard focus ring (>= 3:1 against white).
    MuiButtonBase: {
      styleOverrides: {
        root: ({ theme: t }) => ({
          "&:focus-visible": {
            outline: `3px solid ${t.palette.primary.light}`,
            outlineOffset: 2,
          },
        }),
      },
    },
  },
});

// Scale headings down on small screens.
theme = responsiveFontSizes(theme, { factor: 2.5 });

export default theme;
