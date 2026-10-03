const { z } = require("zod");

function enumListSchema(allowedValues, fieldName) {
  return z
    .preprocess((raw) => {
      if (raw === undefined || raw === null || raw === "") return undefined;
      if (Array.isArray(raw)) return raw.join(",");
      return String(raw);
    }, z.string().refine((value) => {
      const tokens = value.split(",").map((part) => part.trim()).filter(Boolean);
      if (tokens.length === 0) return false;
      return tokens.every((token) => allowedValues.includes(token));
    }, `${fieldName} must be a comma-separated list of valid values: ${allowedValues.join(", ")}`).optional())
}

const createLeadSchema = z.object({
  clientName: z.string().min(1, "Client name is required").max(200),
  contactPerson: z.string().min(1, "Contact person is required").max(200),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().min(6, "Phone number looks too short").max(20),
  alternatePhone: z.string().max(20).optional().or(z.literal("")),
  address: z.string().max(500).optional(),
  source: z.string().min(1, "Lead source is required"),
  productInterest: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  tags: z.array(z.string()).optional(),
  assignToUserId: z.string().uuid().optional(), // optional immediate assignment
});

const updateLeadSchema = z.object({
  clientName: z.string().min(1, "Client name is required").max(200).optional(),
  contactPerson: z.string().min(1, "Contact person is required").max(200).optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().min(6, "Phone number looks too short").max(20).optional(),
  alternatePhone: z.string().max(20).optional().or(z.literal("")),
  address: z.string().max(500).optional().or(z.literal("")),
  source: z.string().min(1, "Lead source is required").max(200).optional(),
  productInterest: z.string().max(200).optional().or(z.literal("")),
  description: z.string().max(2000).optional().or(z.literal("")),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  tags: z.array(z.string()).optional(),
});

const changeStatusSchema = z.object({
  status: z.enum([
    "NEW",
    "CONTACTED",
    "QUALIFIED",
    "PROPOSAL",
    "NEGOTIATION",
    "ON_HOLD",
    "CONVERTED",
    "LOST",
  ]),
  comment: z.string().max(500).optional(),
  lossReason: z.string().max(500).optional(),
});

const changePrioritySchema = z.object({
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
});

const assignLeadSchema = z.object({
  userId: z.string().uuid(),
  reason: z.string().max(500).optional(),
});

const addNoteSchema = z.object({
  body: z.string().min(1, "Note cannot be empty").max(2000),
});

const updateNoteSchema = z.object({
  body: z.string().min(1, "Note cannot be empty").max(2000),
});

const createFollowUpSchema = z.object({
  dueAt: z.string().datetime({ message: "dueAt must be an ISO datetime" }),
  notes: z.string().max(1000).optional(),
});

const updateFollowUpSchema = z.object({
  dueAt: z.string().datetime().optional(),
  notes: z.string().max(1000).optional(),
  status: z.enum(["PENDING", "COMPLETED", "CANCELLED"]).optional(),
});

const listLeadsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().optional(),
  status: enumListSchema(["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "ON_HOLD", "CONVERTED", "LOST"], "status"),
  priority: enumListSchema(["LOW", "MEDIUM", "HIGH", "URGENT"], "priority"),
  assignedTo: z.string().uuid().optional(),
  sortBy: z
    .enum(["createdAt", "updatedAt", "nextFollowUpDate", "priority", "status", "clientName"])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

module.exports = {
  createLeadSchema,
  updateLeadSchema,
  changeStatusSchema,
  changePrioritySchema,
  assignLeadSchema,
  addNoteSchema,
  updateNoteSchema,
  createFollowUpSchema,
  updateFollowUpSchema,
  listLeadsQuerySchema,
};
