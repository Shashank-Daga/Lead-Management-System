import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  Divider,
  Grid,
  IconButton,
  Skeleton,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import AssignmentIndOutlinedIcon from "@mui/icons-material/AssignmentIndOutlined";
import SwapHorizOutlinedIcon from "@mui/icons-material/SwapHorizOutlined";
import AutorenewRoundedIcon from "@mui/icons-material/AutorenewRounded";
import { useSnackbar } from "notistack";

import {
  useDeleteLeadMutation,
  useGetLeadQuery,
} from "../../api/apiSlice";

import {
  StatusChip,
  PriorityChip,
} from "../../components/leads/StatusPriorityChips";

import ChangeStatusDialog from "../../components/leads/ChangeStatusDialog";
import AssignLeadDialog from "../../components/leads/AssignLeadDialog";
import EditLeadDialog from "../../components/leads/EditLeadDialog";
import ConfirmDialog from "../../components/common/ConfirmDialog";

import LeadHistoryTab from "../../components/leads/LeadHistoryTab";
import LeadNotesTab from "../../components/leads/LeadNotesTab";
import LeadFollowUpsTab from "../../components/leads/LeadFollowUpsTab";

import usePermission from "../../hooks/usePermission";
import { PERMISSIONS } from "../../config/permissions";


function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString();
}


function InfoField({
  label,
  value,
  icon,
  href,
  emphasis = false,
}) {
  const content = (
    <Stack direction="row" spacing={1.25} alignItems="flex-start">
      {icon && (
        <Box
          sx={{
            color: "text.secondary",
            display: "flex",
            alignItems: "center",
            mt: 0.15,
          }}
        >
          {icon}
        </Box>
      )}

      <Box minWidth={0}>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            display: "block",
            mb: 0.35,
            fontWeight: 600,
          }}
        >
          {label}
        </Typography>

        <Typography
          variant="body2"
          fontWeight={emphasis ? 600 : 500}
          sx={{
            wordBreak: "break-word",
            color: href ? "primary.main" : "text.primary",
            textDecoration: href ? "none" : undefined,
            "&:hover": href
              ? {
                  textDecoration: "underline",
                }
              : undefined,
          }}
        >
          {value || "—"}
        </Typography>
      </Box>
    </Stack>
  );

  if (!href || !value) {
    return content;
  }

  return (
    <Box
      component="a"
      href={href}
      sx={{
        color: "inherit",
        textDecoration: "none",
        display: "block",
      }}
    >
      {content}
    </Box>
  );
}


function SectionHeader({ title, subtitle }) {
  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle1" fontWeight={700}>
        {title}
      </Typography>

      {subtitle && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 0.35 }}
        >
          {subtitle}
        </Typography>
      )}
    </Box>
  );
}


function LeadDetailSkeleton() {
  return (
    <Stack spacing={2.5}>
      <Card
        variant="outlined"
        elevation={0}
        sx={{
          borderRadius: 3,
          p: { xs: 2, sm: 3 },
        }}
      >
        <Stack spacing={2.5}>
          <Skeleton width={100} height={20} />
          <Skeleton width="45%" height={38} />
          <Skeleton width={180} height={34} />

          <Divider />

          <Grid container spacing={2.5}>
            {Array.from({ length: 8 }).map((_, index) => (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <Skeleton width="35%" height={18} />
                <Skeleton width="75%" height={24} />
              </Grid>
            ))}
          </Grid>
        </Stack>
      </Card>

      <Card
        variant="outlined"
        elevation={0}
        sx={{ borderRadius: 3 }}
      >
        <Skeleton height={56} />
        <Box sx={{ p: { xs: 2, sm: 3 } }}>
          <Skeleton height={30} />
          <Skeleton height={30} />
          <Skeleton height={30} />
        </Box>
      </Card>
    </Stack>
  );
}


export default function LeadDetailPage() {
  const { leadId } = useParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const {
    data: lead,
    isLoading,
    isError,
    error,
    refetch,
  } = useGetLeadQuery(leadId);

  const [deleteLead, { isLoading: isDeleting }] =
    useDeleteLeadMutation();

  const [tab, setTab] = useState(0);

  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const canChangeStatus = usePermission(
    PERMISSIONS.LEAD_CHANGE_STATUS
  );

  const canAssign = usePermission(
    PERMISSIONS.LEAD_ASSIGN,
    PERMISSIONS.LEAD_REASSIGN
  );

  const canEdit = usePermission(
    PERMISSIONS.LEAD_EDIT_ALL,
    PERMISSIONS.LEAD_EDIT_SCOPED,
    PERMISSIONS.LEAD_EDIT_ASSIGNED
  );

  const canDelete = usePermission(
    PERMISSIONS.LEAD_DELETE
  );


  const handleDelete = async () => {
    try {
      await deleteLead(leadId).unwrap();

      enqueueSnackbar("Lead deleted", {
        variant: "success",
      });

      navigate("/leads", { replace: true });
    } catch (err) {
      enqueueSnackbar(
        err?.data?.message || "Failed to delete lead",
        {
          variant: "error",
        }
      );

      setDeleteDialogOpen(false);
    }
  };


  if (isLoading) {
    return <LeadDetailSkeleton />;
  }


  if (isError) {
    return (
      <Card
        variant="outlined"
        elevation={0}
        sx={{
          borderRadius: 3,
          p: { xs: 2.5, sm: 4 },
        }}
      >
        <Stack spacing={1.5}>
          <Typography variant="h6" fontWeight={700}>
            Unable to load lead
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
          >
            {error?.data?.message ||
              "This lead could not be loaded."}
          </Typography>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            sx={{ pt: 1 }}
          >
            <Button
              variant="contained"
              startIcon={<AutorenewRoundedIcon />}
              onClick={() => refetch()}
            >
              Try again
            </Button>

            <Button
              variant="outlined"
              onClick={() => navigate("/leads")}
            >
              Back to leads
            </Button>
          </Stack>
        </Stack>
      </Card>
    );
  }


  if (!lead) {
    return (
      <Card
        variant="outlined"
        elevation={0}
        sx={{
          borderRadius: 3,
          p: { xs: 2.5, sm: 4 },
        }}
      >
        <Typography variant="h6" fontWeight={700}>
          Lead not found
        </Typography>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 0.75 }}
        >
          The lead may have been removed or you may not
          have permission to view it.
        </Typography>

        <Button
          variant="outlined"
          sx={{ mt: 2 }}
          onClick={() => navigate("/leads")}
        >
          Back to leads
        </Button>
      </Card>
    );
  }


  const phoneHref = lead.phone
    ? `tel:${lead.phone}`
    : undefined;

  const emailHref = lead.email
    ? `mailto:${lead.email}`
    : undefined;


  return (
    <Stack spacing={{ xs: 2, sm: 2.5 }}>

      {/* Back navigation */}
      <Box>
        <Button
          variant="text"
          startIcon={<ArrowBackRoundedIcon />}
          onClick={() => navigate("/leads")}
          sx={{
            px: 0.5,
            fontWeight: 600,
          }}
        >
          Back to leads
        </Button>
      </Box>


      {/* Lead header / overview */}
      <Card
        variant="outlined"
        elevation={0}
        sx={{
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            p: { xs: 2, sm: 3 },
          }}
        >
          <Stack spacing={2.5}>

            {/* Header */}
            <Stack
              direction={{
                xs: "column",
                lg: "row",
              }}
              justifyContent="space-between"
              alignItems={{
                xs: "stretch",
                lg: "flex-start",
              }}
              spacing={2.5}
            >
              <Box minWidth={0}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={700}
                  sx={{
                    letterSpacing: 0.5,
                  }}
                >
                  {lead.leadCode}
                </Typography>

                <Typography
                  variant="h4"
                  fontWeight={750}
                  sx={{
                    mt: 0.35,
                    fontSize: {
                      xs: "1.6rem",
                      sm: "2rem",
                    },
                    lineHeight: 1.2,
                    wordBreak: "break-word",
                  }}
                >
                  {lead.clientName}
                </Typography>

                <Stack
                  direction="row"
                  flexWrap="wrap"
                  gap={1}
                  sx={{ mt: 1.25 }}
                >
                  <StatusChip
                    status={lead.status}
                    size="medium"
                  />

                  <PriorityChip
                    priority={lead.priority}
                    size="medium"
                  />
                </Stack>
              </Box>


              {/* Actions */}
              <Stack
                direction="row"
                flexWrap="wrap"
                gap={1}
                sx={{
                  width: {
                    xs: "100%",
                    lg: "auto",
                  },
                }}
              >
                {canEdit && (
                  <Button
                    variant="outlined"
                    startIcon={<EditOutlinedIcon />}
                    onClick={() =>
                      setEditDialogOpen(true)
                    }
                    sx={{
                      flex: {
                        xs: "1 1 calc(50% - 4px)",
                        sm: "0 0 auto",
                      },
                    }}
                  >
                    Edit
                  </Button>
                )}

                {canAssign && (
                  <Button
                    variant="outlined"
                    startIcon={
                      lead.currentAssignee ? (
                        <SwapHorizOutlinedIcon />
                      ) : (
                        <AssignmentIndOutlinedIcon />
                      )
                    }
                    onClick={() =>
                      setAssignDialogOpen(true)
                    }
                    sx={{
                      flex: {
                        xs: "1 1 calc(50% - 4px)",
                        sm: "0 0 auto",
                      },
                    }}
                  >
                    {lead.currentAssignee
                      ? "Reassign"
                      : "Assign"}
                  </Button>
                )}

                {canChangeStatus && (
                  <Button
                    variant="contained"
                    onClick={() =>
                      setStatusDialogOpen(true)
                    }
                    sx={{
                      flex: {
                        xs: "1 1 100%",
                        sm: "0 0 auto",
                      },
                    }}
                  >
                    Change Status
                  </Button>
                )}

                {canDelete && (
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<DeleteOutlineIcon />}
                    onClick={() =>
                      setDeleteDialogOpen(true)
                    }
                    sx={{
                      flex: {
                        xs: "1 1 calc(50% - 4px)",
                        sm: "0 0 auto",
                      },
                    }}
                  >
                    Delete
                  </Button>
                )}
              </Stack>
            </Stack>


            <Divider />


            {/* Contact / ownership */}
            <Box>
              <SectionHeader
                title="Contact & ownership"
                subtitle="Primary contact information and lead responsibility."
              />

              <Grid container spacing={2.5}>
                <Grid item xs={12} sm={6} md={3}>
                  <InfoField
                    label="Contact Person"
                    value={lead.contactPerson}
                  />
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <InfoField
                    label="Phone"
                    value={lead.phone}
                    href={phoneHref}
                    icon={
                      <PhoneOutlinedIcon fontSize="small" />
                    }
                  />
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <InfoField
                    label="Email"
                    value={lead.email}
                    href={emailHref}
                    icon={
                      <EmailOutlinedIcon fontSize="small" />
                    }
                  />
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <InfoField
                    label="Assigned To"
                    value={
                      lead.currentAssignee?.fullName ||
                      "Unassigned"
                    }
                    emphasis
                  />
                </Grid>
              </Grid>
            </Box>


            <Divider />


            {/* Lead information */}
            <Box>
              <SectionHeader
                title="Lead information"
                subtitle="Source, product interest and follow-up details."
              />

              <Grid container spacing={2.5}>
                <Grid item xs={12} sm={6} md={3}>
                  <InfoField
                    label="Source"
                    value={lead.source}
                  />
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <InfoField
                    label="Product / Service"
                    value={lead.productInterest}
                  />
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <InfoField
                    label="Created By"
                    value={lead.createdBy?.fullName}
                  />
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <InfoField
                    label="Next Follow-Up"
                    value={formatDate(
                      lead.nextFollowUpDate
                    )}
                    emphasis={Boolean(
                      lead.nextFollowUpDate
                    )}
                  />
                </Grid>
              </Grid>
            </Box>


            {lead.description && (
              <>
                <Divider />

                <Box>
                  <SectionHeader title="Description" />

                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      bgcolor: "action.hover",
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        whiteSpace: "pre-wrap",
                        lineHeight: 1.7,
                      }}
                    >
                      {lead.description}
                    </Typography>
                  </Box>
                </Box>
              </>
            )}

          </Stack>
        </Box>
      </Card>


      {/* Activity section */}
      <Card
        variant="outlined"
        elevation={0}
        sx={{
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            borderBottom: "1px solid",
            borderColor: "divider",
            overflowX: "auto",
          }}
        >
          <Tabs
            value={tab}
            onChange={(event, value) =>
              setTab(value)
            }
            variant="scrollable"
            scrollButtons={false}
            sx={{
              minHeight: 52,
              px: { xs: 1, sm: 2 },
              "& .MuiTab-root": {
                minHeight: 52,
                minWidth: {
                  xs: 110,
                  sm: 120,
                },
                fontWeight: 600,
                textTransform: "none",
              },
            }}
          >
            <Tab label="Follow-Ups" />
            <Tab label="Notes" />
            <Tab label="History" />
          </Tabs>
        </Box>

        <Box
          sx={{
            p: {
              xs: 2,
              sm: 3,
            },
          }}
        >
          {tab === 0 && (
            <LeadFollowUpsTab leadId={leadId} />
          )}

          {tab === 1 && (
            <LeadNotesTab leadId={leadId} />
          )}

          {tab === 2 && (
            <LeadHistoryTab leadId={leadId} />
          )}
        </Box>
      </Card>


      {/* Dialogs */}
      <ChangeStatusDialog
        open={statusDialogOpen}
        onClose={() =>
          setStatusDialogOpen(false)
        }
        leadId={leadId}
        currentStatus={lead.status}
      />

      <AssignLeadDialog
        open={assignDialogOpen}
        onClose={() =>
          setAssignDialogOpen(false)
        }
        leadId={leadId}
      />

      {editDialogOpen && (
        <EditLeadDialog
          open={editDialogOpen}
          onClose={() =>
            setEditDialogOpen(false)
          }
          lead={lead}
        />
      )}

      <ConfirmDialog
        open={deleteDialogOpen}
        onClose={() =>
          setDeleteDialogOpen(false)
        }
        onConfirm={handleDelete}
        isLoading={isDeleting}
        title="Delete this lead?"
        message={`This will remove "${lead.clientName}" (${lead.leadCode}) from active lists. This action can be reversed only by an administrator restoring the record directly, so make sure this is intended.`}
      />
    </Stack>
  );
}
