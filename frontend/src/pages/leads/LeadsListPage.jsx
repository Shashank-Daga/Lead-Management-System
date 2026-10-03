import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSnackbar } from "notistack";
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import SearchIcon from "@mui/icons-material/SearchOutlined";
import AddIcon from "@mui/icons-material/AddOutlined";
import DownloadIcon from "@mui/icons-material/FileDownloadOutlined";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { useListLeadsQuery } from "../../api/apiSlice";
import { StatusChip, PriorityChip } from "../../components/leads/StatusPriorityChips";
import CreateLeadDialog from "../../components/leads/CreateLeadDialog";
import usePermission from "../../hooks/usePermission";
import { PERMISSIONS } from "../../config/permissions";
import { ALL_STATUSES, ALL_PRIORITIES, STATUS_CONFIG, PRIORITY_CONFIG } from "../../theme/leadDisplay";

export default function LeadsListPage() {
  const navigate = useNavigate();
  const canCreate = usePermission(PERMISSIONS.LEAD_CREATE);
  const canExport = usePermission(PERMISSIONS.EXPORT_DATA);

  const [searchParams, setSearchParams] = useSearchParams();
  // Deep-link support: a notification (e.g. "Executive assigned to you") can
  // link here with ?assignedTo=<userId>&assignedToName=<name> to pre-filter
  // the list to that person's leads. This is the only entry point for this
  // filter today — there is no dropdown for it, since it targets one specific
  // person a caller already knows, not a general "filter by assignee" browse.
  const [assignedTo, setAssignedTo] = useState(searchParams.get("assignedTo") || "");
  const [assignedToName] = useState(searchParams.get("assignedToName") || "");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 25 });
  const [sortModel, setSortModel] = useState([{ field: "createdAt", sort: "desc" }]);
  const [createOpen, setCreateOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  const debouncedSearch = useDebouncedValue(search, 350);

  const handleClearAssignedTo = () => {
    setAssignedTo("");
    const next = new URLSearchParams(searchParams);
    next.delete("assignedTo");
    next.delete("assignedToName");
    setSearchParams(next, { replace: true });
  };

  const queryParams = useMemo(
    () => ({
      page: paginationModel.page + 1,
      pageSize: paginationModel.pageSize,
      search: debouncedSearch || undefined,
      status: status || undefined,
      priority: priority || undefined,
      assignedTo: assignedTo || undefined,
      sortBy: sortModel[0]?.field || "createdAt",
      sortOrder: sortModel[0]?.sort || "desc",
    }),
    [paginationModel, debouncedSearch, status, priority, assignedTo, sortModel]
  );

  const { data, isLoading, isFetching, isError, error } = useListLeadsQuery(queryParams);

  const columns = [
    { field: "leadCode", headerName: "Lead ID", width: 120, sortable: false },
    { field: "clientName", headerName: "Client", flex: 1, minWidth: 160 },
    { field: "contactPerson", headerName: "Contact", flex: 1, minWidth: 140, sortable: false },
    {
      field: "status",
      headerName: "Status",
      width: 140,
      renderCell: (params) => <StatusChip status={params.value} />,
    },
    {
      field: "priority",
      headerName: "Priority",
      width: 120,
      renderCell: (params) => <PriorityChip priority={params.value} />,
    },
    {
      field: "currentAssignee",
      headerName: "Assigned To",
      sortable: false, // backend only sorts on its allow-listed columns
      width: 160,
      // DataGrid v7 signature: (value, row) — no params object.
      valueGetter: (value, row) => row.currentAssignee?.fullName || "Unassigned",
    },
    {
      field: "nextFollowUpDate",
      headerName: "Next Follow-Up",
      width: 170,
      valueGetter: (value, row) =>
        row.nextFollowUpDate ? new Date(row.nextFollowUpDate).toLocaleDateString() : "—",
    },
    {
      field: "createdAt",
      headerName: "Created",
      width: 130,
      valueGetter: (value, row) => new Date(row.createdAt).toLocaleDateString(),
    },
  ];

  /**
   * Downloads the CSV the current user is authorized to export. Only triggers
   * a file download for a successful text/csv response; every failure path
   * (401/403/500/network) surfaces a readable message instead of saving an
   * error body as "leads-export.csv".
   */
  const handleExport = async () => {
    setExporting(true);
    try {
      const token = localStorage.getItem("lms_access_token");
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || "/api"}/dashboard/export/leads.csv`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!response.ok) {
        let message = "Export failed. Please try again.";
        if (response.status === 401) message = "Your session expired. Please sign in again.";
        else if (response.status === 403) message = "You do not have permission to export leads.";
        else {
          const contentType = response.headers.get("content-type") || "";
          if (contentType.includes("application/json")) {
            const body = await response.json().catch(() => null);
            message = body?.error?.message || message;
          }
        }
        enqueueSnackbar(message, { variant: "error" });
        return;
      }

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("text/csv")) {
        enqueueSnackbar("Unexpected response from server; export cancelled.", { variant: "error" });
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      try {
        const a = document.createElement("a");
        a.href = url;
        a.download = "leads-export.csv";
        document.body.appendChild(a);
        a.click();
        a.remove();
      } finally {
        window.URL.revokeObjectURL(url);
      }
    } catch {
      enqueueSnackbar("Network error while exporting. Please try again.", { variant: "error" });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h5" fontWeight={700}>
          Leads
        </Typography>
        <Stack direction="row" spacing={1.5}>
          {canExport && (
            <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleExport} disabled={exporting}>
              {exporting ? "Exporting…" : "Export CSV"}
            </Button>
          )}
          {canCreate && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
              New Lead
            </Button>
          )}
        </Stack>
      </Stack>

      {assignedTo && (
        <Alert
          severity="info"
          onClose={handleClearAssignedTo}
          sx={{ alignItems: "center" }}
        >
          Showing leads assigned to {assignedToName || "this person"}.
        </Alert>
      )}

      <Card sx={{ p: 2, borderRadius: 3 }} elevation={0} variant="outlined">
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            placeholder="Search client, contact, phone, email, or Lead ID…"
            size="small"
            fullWidth
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          <TextField
            select
            size="small"
            label="Status"
            sx={{ minWidth: 160 }}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <MenuItem value="">All statuses</MenuItem>
            {ALL_STATUSES.map((s) => (
              <MenuItem key={s} value={s}>
                {STATUS_CONFIG[s].label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Priority"
            sx={{ minWidth: 160 }}
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            <MenuItem value="">All priorities</MenuItem>
            {ALL_PRIORITIES.map((p) => (
              <MenuItem key={p} value={p}>
                {PRIORITY_CONFIG[p].label}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </Card>

      {isError && (
        <Alert severity="error">{error?.data?.message || "Could not load leads."}</Alert>
      )}

      <Card sx={{ borderRadius: 3, overflow: "hidden" }} elevation={0} variant="outlined">
        <DataGrid
          autoHeight
          rows={data?.items || []}
          columns={columns}
          loading={isLoading || isFetching}
          rowCount={data?.pagination?.total || 0}
          paginationMode="server"
          sortingMode="server"
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          sortModel={sortModel}
          onSortModelChange={setSortModel}
          pageSizeOptions={[10, 25, 50, 100]}
          onRowClick={(params) => navigate(`/leads/${params.id}`)}
          slotProps={{ noRowsOverlay: {} }}
          localeText={{ noRowsLabel: "No leads match your filters." }}
          disableRowSelectionOnClick
          sx={{
            border: "none",
            cursor: "pointer",
            "& .MuiDataGrid-columnHeaders": { bgcolor: "background.default" },
          }}
        />
      </Card>

      <CreateLeadDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </Stack>
  );
}
