// Central place mapping lead status/priority enum values to display label +
// color, so every screen (list, detail, dashboard, chips) renders them
// identically instead of re-deriving colors ad hoc.

export const STATUS_CONFIG = {
  NEW: { label: "New", color: "#6366F1" },
  CONTACTED: { label: "Contacted", color: "#0891B2" },
  QUALIFIED: { label: "Qualified", color: "#0D9488" },
  PROPOSAL: { label: "Proposal", color: "#7C3AED" },
  NEGOTIATION: { label: "Negotiation", color: "#C026D3" },
  ON_HOLD: { label: "On Hold", color: "#B45309" },
  CONVERTED: { label: "Converted", color: "#15803D" },
  LOST: { label: "Lost", color: "#B91C1C" },
};

export const PRIORITY_CONFIG = {
  LOW: { label: "Low", color: "#5A5F73" },
  MEDIUM: { label: "Medium", color: "#0891B2" },
  HIGH: { label: "High", color: "#D97706" },
  URGENT: { label: "Urgent", color: "#B91C1C" },
};

export const ALL_STATUSES = Object.keys(STATUS_CONFIG);
export const ALL_PRIORITIES = Object.keys(PRIORITY_CONFIG);
