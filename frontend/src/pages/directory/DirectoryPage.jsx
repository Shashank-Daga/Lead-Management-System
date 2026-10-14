import { useMemo, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import DownloadIcon from "@mui/icons-material/FileDownloadOutlined";

import { useListProfilesQuery } from "../../api/apiSlice";
import usePermission from "../../hooks/usePermission";
import { PERMISSIONS } from "../../config/permissions";
import Button from "@mui/material/Button";

function SectionCard({ icon, title, description, children }) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 3, minWidth: 0 }}>
      <CardContent
        sx={{
          p: { xs: 2, sm: 3 },
          "&:last-child": { pb: { xs: 2, sm: 3 } },
        }}
      >
        <Stack
          direction="row"
          spacing={1.5}
          alignItems="flex-start"
          sx={{ mb: 2.5 }}
        >
          <Avatar
            sx={{
              bgcolor: "primary.50",
              color: "primary.main",
              width: 42,
              height: 42,
            }}
          >
            {icon}
          </Avatar>

          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 750 }}>
              {title}
            </Typography>

            {description && (
              <Typography variant="body2" color="text.secondary">
                {description}
              </Typography>
            )}
          </Box>
        </Stack>

        {children}
      </CardContent>
    </Card>
  );
}

function initials(name) {
  return String(name || "U")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] || "")
    .join("")
    .toUpperCase();
}

function roleLabel(profile) {
  return profile?.roleName || profile?.roleKey || "User";
}

/**
 * Directory search has two independent boxes; when both are filled, a person
 * must match both. Name: case-insensitive substring. Phone: digits only, so
 * "98765" matches 9876543210 and anything non-numeric is ignored.
 */
function matchesDirectorySearch(person, { name, phone }) {
  const nameText = name.trim().toLowerCase();
  if (nameText && !(person.fullName || "").toLowerCase().includes(nameText)) {
    return false;
  }

  const phoneDigits = phone.replace(/\D/g, "");
  if (phoneDigits && !(person.phone || "").replace(/\D/g, "").includes(phoneDigits)) {
    return false;
  }

  return true;
}

function escapeCsvValue(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function exportProfilesToCsv(profiles) {
  const headers = [
    "Full Name",
    "Email",
    "Mobile Number",
    "Date of Birth",
    "Role",
    "Status",
  ];

  const rows = profiles.map((person) => [
    person.fullName,
    person.email,
    person.phone || "",
    person.dateOfBirth || "",
    roleLabel(person),
    person.isActive ? "Active" : "Inactive",
  ]);

  const csvContent = [
    headers,
    ...rows,
  ]
    .map((row) => row.map(escapeCsvValue).join(","))
    .join("\r\n");

  // BOM helps spreadsheet applications recognize UTF-8.
  const blob = new Blob(["\uFEFF", csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);

  link.href = url;
  link.download = `user-directory-${date}.csv`;

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

export default function DirectoryPage() {
  const canManageUsers = usePermission(PERMISSIONS.USER_MANAGE);
  const canViewTeam = usePermission(PERMISSIONS.LEAD_VIEW_SCOPED);
  const enabled = canManageUsers || canViewTeam;

  const {
    data: profiles = [],
    isLoading,
    isError,
    error,
  } = useListProfilesQuery(undefined, {
    skip: !enabled,
  });

  const [nameSearch, setNameSearch] = useState("");
  const [phoneSearch, setPhoneSearch] = useState("");

  const visibleProfiles = useMemo(
    () =>
      profiles.filter((person) =>
        matchesDirectorySearch(person, { name: nameSearch, phone: phoneSearch })
      ),
    [profiles, nameSearch, phoneSearch]
  );

  if (!enabled) return null;

  return (
    <SectionCard
      icon={<GroupsOutlinedIcon />}
      title={canManageUsers ? "User directory" : "My team"}
      description={
        canManageUsers
          ? "View account contact details and roles."
          : "View your profile and active direct reports."
      }
    >
      {isLoading ? (
        <Box sx={{ display: "grid", placeItems: "center", py: 4 }}>
          <CircularProgress size={28} />
        </Box>
      ) : isError ? (
        <Alert severity="error">
          {error?.data?.message || "Unable to load the user directory."}
        </Alert>
      ) : profiles.length === 0 ? (
        <Typography color="text.secondary">
          No profiles are available.
        </Typography>
      ) : (
        <>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 1 }}>
            <TextField
              value={nameSearch}
              onChange={(event) => setNameSearch(event.target.value)}
              placeholder="Search by name"
              size="small"
              fullWidth
              inputProps={{ "aria-label": "Search by name", maxLength: 100 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchOutlinedIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              value={phoneSearch}
              onChange={(event) =>
                setPhoneSearch(event.target.value.replace(/\D/g, "").slice(0, 10))
              }
              placeholder="Search by mobile number"
              size="small"
              fullWidth
              inputProps={{
                "aria-label": "Search by mobile number",
                inputMode: "numeric",
                maxLength: 10,
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchOutlinedIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />

            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={() => exportProfilesToCsv(visibleProfiles)}
              disabled={visibleProfiles.length === 0}
              sx={{
                flexShrink: 0,
                whiteSpace: "nowrap",
                minHeight: 40,
              }}
            >
              Export CSV
            </Button>
          </Stack>

          {visibleProfiles.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 2 }}>
              No one matches your search.
            </Typography>
          ) : (
            <Stack divider={<Divider flexItem />} spacing={0}>
              {visibleProfiles.map((person) => (
                <Stack
                  key={person.id}
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1.5}
                  alignItems={{ xs: "flex-start", sm: "center" }}
                  sx={{ py: 1.5 }}
                >
                  <Avatar
                    sx={{
                      bgcolor: "primary.main",
                      width: 40,
                      height: 40,
                    }}
                  >
                    {initials(person.fullName)}
                  </Avatar>

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 650 }}>
                      {person.fullName}
                    </Typography>

                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ overflowWrap: "anywhere" }}
                    >
                      {person.email}
                    </Typography>

                    <Typography variant="body2" color="text.secondary">
                      {person.phone || "No phone number"} · DOB:{" "}
                      {person.dateOfBirth || "Not provided"}
                    </Typography>
                  </Box>

                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip
                      size="small"
                      label={roleLabel(person)}
                      variant="outlined"
                    />

                    {!person.isActive && (
                      <Chip size="small" label="Inactive" color="default" />
                    )}
                  </Stack>
                </Stack>
              ))}
            </Stack>
          )}
        </>
      )}
    </SectionCard>
  );
}
