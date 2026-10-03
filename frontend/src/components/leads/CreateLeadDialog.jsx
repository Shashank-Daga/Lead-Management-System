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
import { useCreateLeadMutation } from "../../api/apiSlice";
import { ALL_PRIORITIES, PRIORITY_CONFIG } from "../../theme/leadDisplay";

const schema = z.object({
  clientName: z.string().min(1, "Required"),
  contactPerson: z.string().min(1, "Required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().min(6, "Too short"),
  source: z.string().min(1, "Required"),
  productInterest: z.string().optional(),
  priority: z.string().default("MEDIUM"),
  description: z.string().optional(),
});

export default function CreateLeadDialog({ open, onClose }) {
  const [createLead, { isLoading }] = useCreateLeadMutation();
  const { enqueueSnackbar } = useSnackbar();

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      clientName: "",
      contactPerson: "",
      email: "",
      phone: "",
      source: "",
      productInterest: "",
      priority: "MEDIUM",
      description: "",
    },
  });

  const onSubmit = async (values) => {
    try {
      await createLead(values).unwrap();
      enqueueSnackbar("Lead created", { variant: "success" });
      reset();
      onClose();
    } catch (err) {
      enqueueSnackbar(err?.data?.message || "Failed to create lead", { variant: "error" });
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>New Lead</DialogTitle>
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
              placeholder="Website, Referral, Cold Call…"
              {...register("source")}
              error={Boolean(errors.source)}
              helperText={errors.source?.message}
            />
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
            <TextField label="Product / Service Interested In" fullWidth {...register("productInterest")} />
          </Grid>
          <Grid item xs={12}>
            <TextField label="Description" fullWidth multiline rows={3} {...register("description")} />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit(onSubmit)} disabled={isLoading}>
          Create Lead
        </Button>
      </DialogActions>
    </Dialog>
  );
}
