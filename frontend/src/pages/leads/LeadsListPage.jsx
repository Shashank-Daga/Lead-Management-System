import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSnackbar } from "notistack";
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  Divider,
  IconButton,
  InputAdornment,
  MenuItem,
  Pagination,
  Skeleton,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { DataGrid } from "@mui/x-data-grid";

import SearchIcon from "@mui/icons-material/SearchOutlined";
import AddIcon from "@mui/icons-material/AddOutlined";
import DownloadIcon from "@mui/icons-material/FileDownloadOutlined";
import ClearIcon from "@mui/icons-material/ClearOutlined";
import ArrowForwardIcon from "@mui/icons-material/ArrowForwardOutlined";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import EventOutlinedIcon from "@mui/icons-material/EventOutlined";

import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { useListLeadsQuery } from "../../api/apiSlice";
import {
  StatusChip,
  PriorityChip,
} from "../../components/leads/StatusPriorityChips";
import CreateLeadDialog from "../../components/leads/CreateLeadDialog";
import usePermission from "../../hooks/usePermission";
import { PERMISSIONS } from "../../config/permissions";
import {
  ALL_STATUSES,
  ALL_PRIORITIES,
  STATUS_CONFIG,
  PRIORITY_CONFIG,
} from "../../theme/leadDisplay";

function LeadCardSkeleton() {
  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 2.5,
        p: 2,
      }}
    >
      <Stack spacing={1.5}>
        <Stack
          direction="row"
          justifyContent="space-between"
          spacing={2}
        >
          <Box sx={{ flex: 1 }}>
            <Skeleton width="40%" height={20} />
            <Skeleton width="75%" height={28} />
          </Box>

          <Skeleton
            variant="rounded"
            width={72}
            height={26}
          />
        </Stack>

        <Skeleton width="65%" />
        <Skeleton width="50%" />
        <Skeleton width="60%" />
      </Stack>
    </Card>
  );
}

function LeadMobileCard({ lead, onClick }) {
  const assignee =
    lead.currentAssignee?.fullName ||
    "Unassigned";

  const nextFollowUp = lead.nextFollowUpDate
    ? new Date(
        lead.nextFollowUpDate
      ).toLocaleDateString()
    : "No follow-up scheduled";

  return (
    <Card
      variant="outlined"
      onClick={onClick}
      sx={{
        borderRadius: 2.5,
        cursor: "pointer",
        transition:
          "transform 150ms ease, box-shadow 150ms ease, border-color 150ms ease",

        "&:hover": {
          transform: "translateY(-1px)",
          boxShadow:
            "0 6px 20px rgba(15, 23, 42, 0.07)",
          borderColor:
            "rgba(55, 48, 163, 0.25)",
        },

        "&:active": {
          transform: "translateY(0)",
        },
      }}
    >
      <Box sx={{ p: 2 }}>
        {/* Lead identity */}
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="flex-start"
          spacing={1.5}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="caption"
              color="text.secondary"
              fontWeight={700}
            >
              {lead.leadCode}
            </Typography>

            <Typography
              variant="subtitle1"
              fontWeight={750}
              sx={{
                mt: 0.25,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {lead.clientName}
            </Typography>
          </Box>

          <ArrowForwardIcon
            sx={{
              flexShrink: 0,
              color: "text.disabled",
              mt: 0.5,
            }}
          />
        </Stack>

        {/* Status + priority */}
        <Stack
          direction="row"
          flexWrap="wrap"
          gap={0.75}
          sx={{ mt: 1.5 }}
        >
          <StatusChip status={lead.status} />
          <PriorityChip priority={lead.priority} />
        </Stack>

        <Divider sx={{ my: 1.75 }} />

        {/* Lead information */}
        <Stack spacing={1.15}>
          {lead.contactPerson && (
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
            >
              <PersonOutlineIcon
                sx={{
                  fontSize: 18,
                  color: "text.secondary",
                }}
              />

              <Typography
                variant="body2"
                color="text.secondary"
                noWrap
              >
                {lead.contactPerson}
              </Typography>
            </Stack>
          )}

          {lead.phone && (
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
            >
              <PhoneOutlinedIcon
                sx={{
                  fontSize: 18,
                  color: "text.secondary",
                }}
              />

              <Typography
                variant="body2"
                color="text.secondary"
                noWrap
              >
                {lead.phone}
              </Typography>
            </Stack>
          )}

          {lead.email && (
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
            >
              <EmailOutlinedIcon
                sx={{
                  fontSize: 18,
                  color: "text.secondary",
                }}
              />

              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {lead.email}
              </Typography>
            </Stack>
          )}

          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
          >
            <PersonOutlineIcon
              sx={{
                fontSize: 18,
                color: "text.secondary",
              }}
            />

            <Typography
              variant="body2"
              color="text.secondary"
              noWrap
            >
              {assignee}
            </Typography>
          </Stack>

          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
          >
            <EventOutlinedIcon
              sx={{
                fontSize: 18,
                color: "text.secondary",
              }}
            />

            <Typography
              variant="body2"
              color={
                lead.nextFollowUpDate
                  ? "text.secondary"
                  : "text.disabled"
              }
              noWrap
            >
              {nextFollowUp}
            </Typography>
          </Stack>
        </Stack>
      </Box>
    </Card>
  );
}

function MobileLeadList({
  leads,
  isLoading,
  isFetching,
  onSelect,
  total,
  page,
  pageSize,
  onPageChange,
}) {
  const totalPages = Math.max(
    1,
    Math.ceil(total / pageSize)
  );

  if (isLoading) {
    return (
      <Stack spacing={1.5}>
        {Array.from({ length: 5 }).map(
          (_, index) => (
            <LeadCardSkeleton key={index} />
          )
        )}
      </Stack>
    );
  }

  if (!leads.length) {
    return (
      <Card
        variant="outlined"
        sx={{
          borderRadius: 2.5,
          py: 6,
          px: 2,
          textAlign: "center",
        }}
      >
        <Typography
          variant="subtitle1"
          fontWeight={700}
        >
          No leads found
        </Typography>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 0.5 }}
        >
          Try changing your search or filters.
        </Typography>
      </Card>
    );
  }

  return (
    <Stack spacing={1.5}>
      {leads.map((lead) => (
        <LeadMobileCard
          key={lead.id}
          lead={lead}
          onClick={() => onSelect(lead.id)}
        />
      ))}

      <Stack
        direction={{
          xs: "column",
          sm: "row",
        }}
        alignItems="center"
        justifyContent="space-between"
        spacing={1.5}
        sx={{
          pt: 1,
          opacity: isFetching ? 0.65 : 1,
          transition: "opacity 150ms ease",
        }}
      >
        <Typography
          variant="caption"
          color="text.secondary"
        >
          {total === 0
            ? "No results"
            : `Showing ${
                page * pageSize + 1
              }–${Math.min(
                (page + 1) * pageSize,
                total
              )} of ${total}`}
        </Typography>

        {totalPages > 1 && (
          <Pagination
            count={totalPages}
            page={page + 1}
            onChange={(_, value) =>
              onPageChange(value - 1)
            }
            color="primary"
            size="small"
            showFirstButton
            showLastButton
          />
        )}
      </Stack>
    </Stack>
  );
}

export default function LeadsListPage() {
  const navigate = useNavigate();
  const theme = useTheme();

  /*
   * Mobile gets a card-based experience.
   * Tablet and desktop retain the DataGrid.
   */
  const isMobile = useMediaQuery(
    theme.breakpoints.down("sm")
  );

  const canCreate = usePermission(
    PERMISSIONS.LEAD_CREATE
  );

  const canExport = usePermission(
    PERMISSIONS.EXPORT_DATA
  );

  const [searchParams, setSearchParams] =
    useSearchParams();

  /*
   * Deep-link support:
   * notifications can navigate here with:
   *
   * ?assignedTo=<userId>&assignedToName=<name>
   */
  const [assignedTo, setAssignedTo] =
    useState(
      searchParams.get("assignedTo") || ""
    );

  const [assignedToName] = useState(
    searchParams.get("assignedToName") || ""
  );

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");

  const [paginationModel, setPaginationModel] =
    useState({
      page: 0,
      pageSize: 25,
    });

  const [sortModel, setSortModel] = useState([
    {
      field: "createdAt",
      sort: "desc",
    },
  ]);

  const [createOpen, setCreateOpen] =
    useState(false);

  const [exporting, setExporting] =
    useState(false);

  const { enqueueSnackbar } = useSnackbar();

  const debouncedSearch =
    useDebouncedValue(search, 350);

  /*
   * Reset pagination whenever filters change.
   * This prevents situations where a user is on page 5,
   * applies a filter and receives an empty result because
   * the filtered dataset only has 1 page.
   */
  const resetToFirstPage = () => {
    setPaginationModel((current) => ({
      ...current,
      page: 0,
    }));
  };

  const handleSearchChange = (event) => {
    setSearch(event.target.value);
    resetToFirstPage();
  };

  const handleStatusChange = (event) => {
    setStatus(event.target.value);
    resetToFirstPage();
  };

  const handlePriorityChange = (event) => {
    setPriority(event.target.value);
    resetToFirstPage();
  };

  const handleClearAssignedTo = () => {
    setAssignedTo("");

    const next =
      new URLSearchParams(searchParams);

    next.delete("assignedTo");
    next.delete("assignedToName");

    setSearchParams(next, {
      replace: true,
    });

    resetToFirstPage();
  };

  const handleClearFilters = () => {
    setSearch("");
    setStatus("");
    setPriority("");
    resetToFirstPage();
  };

  const hasFilters =
    Boolean(search) ||
    Boolean(status) ||
    Boolean(priority);

  const queryParams = useMemo(
    () => ({
      page: paginationModel.page + 1,
      pageSize: paginationModel.pageSize,
      search:
        debouncedSearch || undefined,
      status: status || undefined,
      priority: priority || undefined,
      assignedTo:
        assignedTo || undefined,
      sortBy:
        sortModel[0]?.field ||
        "createdAt",
      sortOrder:
        sortModel[0]?.sort ||
        "desc",
    }),
    [
      paginationModel,
      debouncedSearch,
      status,
      priority,
      assignedTo,
      sortModel,
    ]
  );

  const {
    data,
    isLoading,
    isFetching,
    isError,
    error,
  } = useListLeadsQuery(queryParams);

  const columns = [
    {
      field: "leadCode",
      headerName: "Lead ID",
      width: 120,
      sortable: false,
    },

    {
      field: "clientName",
      headerName: "Client",
      flex: 1,
      minWidth: 180,
    },

    {
      field: "contactPerson",
      headerName: "Contact",
      flex: 1,
      minWidth: 150,
      sortable: false,
    },

    {
      field: "status",
      headerName: "Status",
      width: 140,
      renderCell: (params) => (
        <StatusChip
          status={params.value}
        />
      ),
    },

    {
      field: "priority",
      headerName: "Priority",
      width: 120,
      renderCell: (params) => (
        <PriorityChip
          priority={params.value}
        />
      ),
    },

    {
      field: "currentAssignee",
      headerName: "Assigned To",
      sortable: false,
      width: 160,

      valueGetter: (value, row) =>
        row.currentAssignee?.fullName ||
        "Unassigned",
    },

    {
      field: "nextFollowUpDate",
      headerName: "Next Follow-Up",
      width: 170,

      valueGetter: (value, row) =>
        row.nextFollowUpDate
          ? new Date(
              row.nextFollowUpDate
            ).toLocaleDateString()
          : "—",
    },

    {
      field: "createdAt",
      headerName: "Created",
      width: 130,

      valueGetter: (value, row) =>
        new Date(
          row.createdAt
        ).toLocaleDateString(),
    },
  ];

  /**
   * Downloads the CSV the current user is authorized to export.
   */
  const handleExport = async () => {
    setExporting(true);

    try {
      const token = localStorage.getItem(
        "lms_access_token"
      );

      const response = await fetch(
        `${
          import.meta.env
            .VITE_API_BASE_URL || "/api"
        }/dashboard/export/leads.csv`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        let message =
          "Export failed. Please try again.";

        if (response.status === 401) {
          message =
            "Your session expired. Please sign in again.";
        } else if (
          response.status === 403
        ) {
          message =
            "You do not have permission to export leads.";
        } else {
          const contentType =
            response.headers.get(
              "content-type"
            ) || "";

          if (
            contentType.includes(
              "application/json"
            )
          ) {
            const body =
              await response
                .json()
                .catch(() => null);

            message =
              body?.error?.message ||
              message;
          }
        }

        enqueueSnackbar(message, {
          variant: "error",
        });

        return;
      }

      const contentType =
        response.headers.get(
          "content-type"
        ) || "";

      if (
        !contentType.includes("text/csv")
      ) {
        enqueueSnackbar(
          "Unexpected response from server; export cancelled.",
          {
            variant: "error",
          }
        );

        return;
      }

      const blob =
        await response.blob();

      const url =
        window.URL.createObjectURL(blob);

      try {
        const a =
          document.createElement("a");

        a.href = url;
        a.download =
          "leads-export.csv";

        document.body.appendChild(a);
        a.click();
        a.remove();
      } finally {
        window.URL.revokeObjectURL(
          url
        );
      }
    } catch {
      enqueueSnackbar(
        "Network error while exporting. Please try again.",
        {
          variant: "error",
        }
      );
    } finally {
      setExporting(false);
    }
  };

  const leads = data?.items || [];
  const total =
    data?.pagination?.total || 0;

  return (
    <Stack
      spacing={{
        xs: 2,
        sm: 2.5,
      }}
    >
      {/* =========================
          PAGE HEADER
      ========================== */}
      <Stack
        direction={{
          xs: "column",
          sm: "row",
        }}
        justifyContent="space-between"
        alignItems={{
          xs: "stretch",
          sm: "center",
        }}
        spacing={1.5}
      >
        <Box>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 800,
              letterSpacing: "-0.025em",
            }}
          >
            Leads
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 0.5 }}
          >
            Manage, track and follow up on
            your leads.
          </Typography>
        </Box>

        <Stack
          direction={{
            xs: "column",
            sm: "row",
          }}
          spacing={1}
        >
          {canExport && (
            <Button
              variant="outlined"
              startIcon={
                <DownloadIcon />
              }
              onClick={handleExport}
              disabled={exporting}
              fullWidth={isMobile}
            >
              {exporting
                ? "Exporting…"
                : "Export CSV"}
            </Button>
          )}

          {canCreate && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() =>
                setCreateOpen(true)
              }
              fullWidth={isMobile}
            >
              New Lead
            </Button>
          )}
        </Stack>
      </Stack>

      {/* =========================
          DEEP-LINK ASSIGNEE FILTER
      ========================== */}
      {assignedTo && (
        <Alert
          severity="info"
          onClose={
            handleClearAssignedTo
          }
          sx={{
            alignItems: "center",
            borderRadius: 2,
          }}
        >
          Showing leads assigned to{" "}
          <strong>
            {assignedToName ||
              "this person"}
          </strong>
          .
        </Alert>
      )}

      {/* =========================
          FILTER BAR
      ========================== */}
      <Card
        variant="outlined"
        sx={{
          borderRadius: 2.5,
        }}
      >
        <Box
          sx={{
            p: {
              xs: 1.5,
              sm: 2,
            },
          }}
        >
          <Stack
            direction={{
              xs: "column",
              md: "row",
            }}
            spacing={1.25}
          >
            {/* Search */}
            <TextField
              placeholder="Search client, contact, phone, email, or Lead ID…"
              size="small"
              fullWidth
              value={search}
              onChange={
                handleSearchChange
              }
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />

            {/* Status */}
            <TextField
              select
              size="small"
              label="Status"
              sx={{
                minWidth: {
                  xs: "100%",
                  sm: 170,
                  md: 155,
                },
              }}
              value={status}
              onChange={
                handleStatusChange
              }
            >
              <MenuItem value="">
                All statuses
              </MenuItem>

              {ALL_STATUSES.map(
                (item) => (
                  <MenuItem
                    key={item}
                    value={item}
                  >
                    {
                      STATUS_CONFIG[
                        item
                      ].label
                    }
                  </MenuItem>
                )
              )}
            </TextField>

            {/* Priority */}
            <TextField
              select
              size="small"
              label="Priority"
              sx={{
                minWidth: {
                  xs: "100%",
                  sm: 170,
                  md: 155,
                },
              }}
              value={priority}
              onChange={
                handlePriorityChange
              }
            >
              <MenuItem value="">
                All priorities
              </MenuItem>

              {ALL_PRIORITIES.map(
                (item) => (
                  <MenuItem
                    key={item}
                    value={item}
                  >
                    {
                      PRIORITY_CONFIG[
                        item
                      ].label
                    }
                  </MenuItem>
                )
              )}
            </TextField>
          </Stack>

          {/* Active filters */}
          {(hasFilters ||
            assignedTo) && (
            <Stack
              direction="row"
              flexWrap="wrap"
              alignItems="center"
              gap={0.75}
              sx={{ mt: 1.5 }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mr: 0.25 }}
              >
                Filters:
              </Typography>

              {search && (
                <Chip
                  size="small"
                  label={`Search: ${search}`}
                  onDelete={() =>
                    setSearch("")
                  }
                />
              )}

              {status && (
                <Chip
                  size="small"
                  label={`Status: ${
                    STATUS_CONFIG[
                      status
                    ]?.label ||
                    status
                  }`}
                  onDelete={() =>
                    setStatus("")
                  }
                />
              )}

              {priority && (
                <Chip
                  size="small"
                  label={`Priority: ${
                    PRIORITY_CONFIG[
                      priority
                    ]?.label ||
                    priority
                  }`}
                  onDelete={() =>
                    setPriority("")
                  }
                />
              )}

              {assignedTo && (
                <Chip
                  size="small"
                  label={`Assigned: ${
                    assignedToName ||
                    "Selected user"
                  }`}
                  onDelete={
                    handleClearAssignedTo
                  }
                />
              )}

              {hasFilters && (
                <Button
                  size="small"
                  color="inherit"
                  startIcon={
                    <ClearIcon fontSize="small" />
                  }
                  onClick={
                    handleClearFilters
                  }
                  sx={{
                    ml: {
                      xs: 0,
                      sm: 0.5,
                    },
                  }}
                >
                  Clear filters
                </Button>
              )}
            </Stack>
          )}
        </Box>
      </Card>

      {/* =========================
          ERROR STATE
      ========================== */}
      {isError && (
        <Alert
          severity="error"
          sx={{
            borderRadius: 2,
          }}
        >
          {error?.data?.message ||
            "Could not load leads."}
        </Alert>
      )}

      {/* =========================
          MOBILE LIST
      ========================== */}
      {isMobile ? (
        <MobileLeadList
          leads={leads}
          isLoading={isLoading}
          isFetching={isFetching}
          total={total}
          page={paginationModel.page}
          pageSize={
            paginationModel.pageSize
          }
          onPageChange={(page) =>
            setPaginationModel(
              (current) => ({
                ...current,
                page,
              })
            )
          }
          onSelect={(leadId) =>
            navigate(
              `/leads/${leadId}`
            )
          }
        />
      ) : (
        /* =========================
           TABLET + DESKTOP GRID
        ========================== */
        <Card
          variant="outlined"
          sx={{
            borderRadius: 2.5,
            overflow: "hidden",
          }}
        >
          <DataGrid
            autoHeight
            rows={leads}
            columns={columns}
            loading={
              isLoading || isFetching
            }
            rowCount={total}
            paginationMode="server"
            sortingMode="server"
            paginationModel={
              paginationModel
            }
            onPaginationModelChange={
              setPaginationModel
            }
            sortModel={sortModel}
            onSortModelChange={
              setSortModel
            }
            pageSizeOptions={[
              10,
              25,
              50,
              100,
            ]}
            onRowClick={(params) =>
              navigate(
                `/leads/${params.id}`
              )
            }
            disableRowSelectionOnClick
            localeText={{
              noRowsLabel:
                "No leads match your filters.",
            }}
            sx={{
              border: "none",
              cursor: "pointer",

              "& .MuiDataGrid-columnHeaders":
                {
                  bgcolor:
                    "background.default",
                },

              "& .MuiDataGrid-cell": {
                py: 1,
              },

              "& .MuiDataGrid-row": {
                minHeight:
                  "56px !important",
              },

              "& .MuiDataGrid-columnHeaderTitle":
                {
                  fontWeight: 700,
                },
            }}
          />
        </Card>
      )}

      {/* =========================
          CREATE LEAD
      ========================== */}
      <CreateLeadDialog
        open={createOpen}
        onClose={() =>
          setCreateOpen(false)
        }
      />
    </Stack>
  );
}
