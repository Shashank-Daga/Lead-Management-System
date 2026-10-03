import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  CircularProgress,
  Divider,
  Grid,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import { useSnackbar } from "notistack";
import { useDeleteLeadMutation, useGetLeadQuery } from "../../api/apiSlice";
import { StatusChip, PriorityChip } from "../../components/leads/StatusPriorityChips";
import ChangeStatusDialog from "../../components/leads/ChangeStatusDialog";
import AssignLeadDialog from "../../components/leads/AssignLeadDialog";
import EditLeadDialog from "../../components/leads/EditLeadDialog";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import LeadHistoryTab from "../../components/leads/LeadHistoryTab";
import LeadNotesTab from "../../components/leads/LeadNotesTab";
import LeadFollowUpsTab from "../../components/leads/LeadFollowUpsTab";
import usePermission from "../../hooks/usePermission";
import { PERMISSIONS } from "../../config/permissions";

function InfoField({ label, value }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={500}>
        {value || "—"}
      </Typography>
    </Box>
  );
}

export default function LeadDetailPage() {
  const { leadId } = useParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { data: lead, isLoading, isError, error } = useGetLeadQuery(leadId);
  const [deleteLead, { isLoading: isDeleting }] = useDeleteLeadMutation();
  const [tab, setTab] = useState(0);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const canChangeStatus = usePermission(PERMISSIONS.LEAD_CHANGE_STATUS);
  const canAssign = usePermission(PERMISSIONS.LEAD_ASSIGN, PERMISSIONS.LEAD_REASSIGN);
  const canEdit = usePermission(
    PERMISSIONS.LEAD_EDIT_ALL,
    PERMISSIONS.LEAD_EDIT_SCOPED,
    PERMISSIONS.LEAD_EDIT_ASSIGNED
  );
  const canDelete = usePermission(PERMISSIONS.LEAD_DELETE);

  const handleDelete = async () => {
    try {
      await deleteLead(leadId).unwrap();
      enqueueSnackbar("Lead deleted", { variant: "success" });
      navigate("/leads", { replace: true });
    } catch (err) {
      enqueueSnackbar(err?.data?.message || "Failed to delete lead", { variant: "error" });
      setDeleteDialogOpen(false);
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" py={10}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError) {
    return (
      <Box py={4}>
        <Typography variant="h6" color="error">Unable to load lead.</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {error?.data?.message || "This lead could not be loaded."}
        </Typography>
        <Button variant="outlined" sx={{ mt: 2 }} onClick={() => window.history.back()}>
          Back to leads
        </Button>
      </Box>
    );
  }

  if (!lead) {
    return (
      <Box py={4}>
        <Typography variant="h6">Lead not found.</Typography>
        <Button variant="outlined" sx={{ mt: 2 }} onClick={() => window.history.back()}>
          Back to leads
        </Button>
      </Box>
    );
  }

  return (
    <Stack spacing={2.5}>
      <Card sx={{ p: 3, borderRadius: 3 }} elevation={0} variant="outlined">
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={2}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              {lead.leadCode}
            </Typography>
            <Typography variant="h5" fontWeight={700}>
              {lead.clientName}
            </Typography>
            <Stack direction="row" spacing={1} mt={1}>
              <StatusChip status={lead.status} size="medium" />
              <PriorityChip priority={lead.priority} size="medium" />
            </Stack>
          </Box>
          <Stack direction="row" spacing={1.5}>
            {canEdit && (
              <Button
                variant="outlined"
                startIcon={<EditOutlinedIcon />}
                onClick={() => setEditDialogOpen(true)}
              >
                Edit
              </Button>
            )}
            {canAssign && (
              <Button variant="outlined" onClick={() => setAssignDialogOpen(true)}>
                {lead.currentAssignee ? "Reassign" : "Assign"}
              </Button>
            )}
            {canChangeStatus && (
              <Button variant="contained" onClick={() => setStatusDialogOpen(true)}>
                Change Status
              </Button>
            )}
            {canDelete && (
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteOutlineIcon />}
                onClick={() => setDeleteDialogOpen(true)}
              >
                Delete
              </Button>
            )}
          </Stack>
        </Stack>

        <Divider sx={{ my: 2.5 }} />

        <Grid container spacing={2.5}>
          <Grid item xs={6} sm={3}>
            <InfoField label="Contact Person" value={lead.contactPerson} />
          </Grid>
          <Grid item xs={6} sm={3}>
            <InfoField label="Phone" value={lead.phone} />
          </Grid>
          <Grid item xs={6} sm={3}>
            <InfoField label="Email" value={lead.email} />
          </Grid>
          <Grid item xs={6} sm={3}>
            <InfoField label="Source" value={lead.source} />
          </Grid>
          <Grid item xs={6} sm={3}>
            <InfoField label="Assigned To" value={lead.currentAssignee?.fullName || "Unassigned"} />
          </Grid>
          <Grid item xs={6} sm={3}>
            <InfoField label="Product / Service" value={lead.productInterest} />
          </Grid>
          <Grid item xs={6} sm={3}>
            <InfoField label="Created By" value={lead.createdBy?.fullName} />
          </Grid>
          <Grid item xs={6} sm={3}>
            <InfoField
              label="Next Follow-Up"
              value={lead.nextFollowUpDate ? new Date(lead.nextFollowUpDate).toLocaleString() : null}
            />
          </Grid>
          {lead.description && (
            <Grid item xs={12}>
              <InfoField label="Description" value={lead.description} />
            </Grid>
          )}
        </Grid>
      </Card>

      <Card sx={{ borderRadius: 3 }} elevation={0} variant="outlined">
        <Tabs
          value={tab}
          onChange={(e, v) => setTab(v)}
          sx={{ px: 2, borderBottom: "1px solid", borderColor: "divider" }}
        >
          <Tab label="Follow-Ups" />
          <Tab label="Notes" />
          <Tab label="History" />
        </Tabs>
        <Box sx={{ p: 3 }}>
          {tab === 0 && <LeadFollowUpsTab leadId={leadId} />}
          {tab === 1 && <LeadNotesTab leadId={leadId} />}
          {tab === 2 && <LeadHistoryTab leadId={leadId} />}
        </Box>
      </Card>

      <ChangeStatusDialog
        open={statusDialogOpen}
        onClose={() => setStatusDialogOpen(false)}
        leadId={leadId}
        currentStatus={lead.status}
      />
      <AssignLeadDialog
        open={assignDialogOpen}
        onClose={() => setAssignDialogOpen(false)}
        leadId={leadId}
      />
      {editDialogOpen && (
        <EditLeadDialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} lead={lead} />
      )}
      <ConfirmDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        isLoading={isDeleting}
        title="Delete this lead?"
        message={`This will remove "${lead.clientName}" (${lead.leadCode}) from active lists. This action can be reversed only by an administrator restoring the record directly, so make sure this is intended.`}
      />
    </Stack>
  );
}
