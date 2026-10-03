import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  TextField,
} from "@mui/material";
import { useSnackbar } from "notistack";
import { useUpdateLeadMutation } from "../../api/apiSlice";
import { ALL_PRIORITIES, PRIORITY_CONFIG } from "../../theme/leadDisplay";

// Mirrors the backend's updateLeadSchema (all fields optional, empty string
// allowed for nullable fields) so client-side errors match what the server
// would reject — the server remains authoritative either way.
const schema = z.object({
  clientName: z.string().min(1, "Required").max(200),
  contactPerson: z.string().min(1, "Required").max(200),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().min(6, "Too short").max(20),
  alternatePhone: z.string().max(20).optional().or(z.literal("")),
  address: z.string().max(500).optional().or(z.literal("")),
  source: z.string().min(1, "Required").max(200),
  productInterest: z.string().max(200).optional().or(z.literal("")),
  description: z.string().max(2000).optional().or(z.literal("")),
  priority: z.string(),
});

/** Builds react-hook-form defaultValues from a lead record, coalescing nulls to "" for controlled inputs. */
function toFormValues(lead) {
  return {
    clientName: lead.clientName || "",
    contactPerson: lead.contactPerson || "",
    email: lead.email || "",
    phone: lead.phone || "",
    alternatePhone: lead.alternatePhone || "",
    address: lead.address || "",
    source: lead.source || "",
    productInterest: lead.productInterest || "",
    description: lead.description || "",
    priority: lead.priority || "MEDIUM",
  };
}

export default function EditLeadDialog({ open, onClose, lead }) {
  const [updateLead, { isLoading }] = useUpdateLeadMutation();
  const { enqueueSnackbar } = useSnackbar();

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: toFormValues(lead),
  });

  // Re-sync the form whenever a different lead is opened, or the dialog is
  // re-opened after the underlying lead changed elsewhere (e.g. another tab).
  useEffect(() => {
    if (open) reset(toFormValues(lead));
  }, [open, lead, reset]);

  const onSubmit = async (values) => {
    if (!isDirty) {
      onClose();
      return;
    }
    try {
      await updateLead({ leadId: lead.id, ...values }).unwrap();
      enqueueSnackbar("Lead updated", { variant: "success" });
      onClose();
    } catch (err) {
      enqueueSnackbar(err?.data?.message || "Failed to update lead", { variant: "error" });
    }
  };

  const handleClose = () => {
    reset(toFormValues(lead));
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit Lead — {lead.leadCode}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Client / Company"
              fullWidth
              {...register("clientName")}
              error={Boolean(errors.clientName)}
              helperText={errors.clientName?.message}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Contact Person"
              fullWidth
              {...register("contactPerson")}
              error={Boolean(errors.contactPerson)}
              helperText={errors.contactPerson?.message}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Phone"
              fullWidth
              {...register("phone")}
              error={Boolean(errors.phone)}
              helperText={errors.phone?.message}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Alternate Phone"
              fullWidth
              {...register("alternatePhone")}
              error={Boolean(errors.alternatePhone)}
              helperText={errors.alternatePhone?.message}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Email"
              fullWidth
              {...register("email")}
              error={Boolean(errors.email)}
              helperText={errors.email?.message}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Lead Source"
              fullWidth
              {...register("source")}
              error={Boolean(errors.source)}
              helperText={errors.source?.message}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField label="Address" fullWidth {...register("address")} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Product / Service Interested In" fullWidth {...register("productInterest")} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Controller
              name="priority"
              control={control}
              render={({ field }) => (
                <TextField select label="Priority" fullWidth {...field}>
                  {ALL_PRIORITIES.map((p) => (
                    <MenuItem key={p} value={p}>
                      {PRIORITY_CONFIG[p].label}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField label="Description" fullWidth multiline rows={3} {...register("description")} />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSubmit(onSubmit)} disabled={isLoading}>
          {isLoading ? "Saving…" : "Save Changes"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
