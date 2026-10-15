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

/**
 * Spreadsheet apps run text that starts with = + - @ (or a tab / carriage
 * return) as a formula, so a name like `=HYPERLINK(...)` in an export could
 * execute when opened in Excel. Prefix such values with an apostrophe so they
 * are shown as plain text. Plain numbers and phone numbers (e.g. "+91 98765
 * 43210", "-5") are left untouched.
 */
function neutralizeFormula(text) {
  if (!/^[=+\-@\t\r]/.test(text)) return text;
  if (/^[+-]?[\d\s().-]+$/.test(text) && /\d/.test(text)) return text;
  return `'${text}`;
}

function escapeCsvField(value) {
  const str = neutralizeFormula(value === null || value === undefined ? "" : String(value));
  // Quote any field containing a comma, quote, or newline; double up internal quotes.
  if (/[",\r\n]/.test(str)) {
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

module.exports = { exportLeadsCsv, escapeCsvField, neutralizeFormula };
