import { Chip } from "@mui/material";
import { STATUS_CONFIG, PRIORITY_CONFIG } from "../../theme/leadDisplay";

export function StatusChip({ status, size = "small" }) {
  const config = STATUS_CONFIG[status] || { label: status, color: "#5A5F73" };
  return (
    <Chip
      size={size}
      label={config.label}
      sx={{
        bgcolor: `${config.color}1A`, // ~10% alpha tint of the status color
        color: config.color,
        border: `1px solid ${config.color}40`,
      }}
    />
  );
}

export function PriorityChip({ priority, size = "small" }) {
  const config = PRIORITY_CONFIG[priority] || { label: priority, color: "#5A5F73" };
  return (
    <Chip
      size={size}
      label={config.label}
      variant="outlined"
      sx={{ borderColor: config.color, color: config.color, fontWeight: 700 }}
    />
  );
}
