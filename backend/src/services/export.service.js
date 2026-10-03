const prisma = require("../config/prisma");
const { buildLeadVisibilityWhere } = require("./leadScope.service");
const { getTeamMemberIds } = require("./lead.service");

const COLUMNS = [
  ["leadCode", "Lead ID"],
  ["clientName", "Client Name"],
  ["contactPerson", "Contact Person"],
  ["email", "Email"],
  ["phone", "Phone"],
  ["source", "Source"],
  ["status", "Status"],
  ["priority", "Priority"],
  ["assignee", "Assigned To"],
  ["createdAt", "Created At"],
  ["nextFollowUpDate", "Next Follow-Up"],
];

function escapeCsvField(value) {
  const str = value === null || value === undefined ? "" : String(value);
  // Quote any field containing a comma, quote, or newline; double up internal quotes.
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

async function exportLeadsCsv(user) {
  const teamMemberIds = user.roleKey === "MANAGER" ? await getTeamMemberIds(user.id) : [];
  const where = buildLeadVisibilityWhere(user, teamMemberIds);

  const leads = await prisma.lead.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { currentAssignee: { select: { fullName: true } } },
  });

  const header = COLUMNS.map(([, label]) => escapeCsvField(label)).join(",");
  const rows = leads.map((lead) => {
    const row = {
      ...lead,
      assignee: lead.currentAssignee?.fullName || "Unassigned",
      createdAt: lead.createdAt.toISOString(),
      nextFollowUpDate: lead.nextFollowUpDate ? lead.nextFollowUpDate.toISOString() : "",
    };
    return COLUMNS.map(([key]) => escapeCsvField(row[key])).join(",");
  });

  return [header, ...rows].join("\n");
}

module.exports = { exportLeadsCsv };
