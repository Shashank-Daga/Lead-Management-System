const prisma = require("../config/prisma");
const { PERMISSIONS } = require("../config/permissions");
const { buildLeadVisibilityWhere } = require("./leadScope.service");
const { getTeamMemberIds } = require("./lead.service");
const followUpService = require("./followUp.service");

// A lead is "resolved" once it reaches a terminal status; everything else is
// still open work for whoever it is assigned to.
const RESOLVED_STATUSES = ["CONVERTED", "LOST"];
const RECENT_ASSIGNMENT_DAYS = 7;

/** Which slice of data the dashboard covers, so the UI can label it honestly. */
function resolveScope(user) {
  if (user.permissions.has(PERMISSIONS.LEAD_VIEW_ALL)) return "organization";
  if (user.permissions.has(PERMISSIONS.LEAD_VIEW_SCOPED)) return "team";
  return "own";
}

function endOfToday(now = new Date()) {
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return end;
}

/**
 * Dashboard numbers for the requesting user. Every query is built on
 * `buildLeadVisibilityWhere` / `buildFollowUpScopeWhere`, so an Executive only
 * ever sees their own assigned leads and follow-ups, a Manager their team's,
 * and an Admin the whole organization — and never another organization.
 */
async function getDashboardData(user) {
  const teamMemberIds = user.roleKey === "MANAGER" ? await getTeamMemberIds(user.id) : [];
  const where = buildLeadVisibilityWhere(user, teamMemberIds);
  const now = new Date();
  const recentSince = new Date(now.getTime() - RECENT_ASSIGNMENT_DAYS * 24 * 60 * 60 * 1000);

  const [
    statusCounts,
    priorityCounts,
    total,
    convertedCount,
    lostCount,
    openCount,
    newCount,
    recentlyAssigned,
    overdue,
    upcoming,
    dueTodayCount,
  ] = await Promise.all([
    prisma.lead.groupBy({ by: ["status"], where, _count: { _all: true } }),
    prisma.lead.groupBy({ by: ["priority"], where, _count: { _all: true } }),
    prisma.lead.count({ where }),
    prisma.lead.count({ where: { ...where, status: "CONVERTED" } }),
    prisma.lead.count({ where: { ...where, status: "LOST" } }),
    prisma.lead.count({ where: { ...where, status: { notIn: RESOLVED_STATUSES } } }),
    prisma.lead.count({ where: { ...where, status: "NEW" } }),
    prisma.lead.findMany({
      where: {
        ...where,
        status: { notIn: RESOLVED_STATUSES },
        assignmentDate: { gte: recentSince },
      },
      orderBy: { assignmentDate: "desc" },
      take: 5,
      select: {
        id: true,
        leadCode: true,
        clientName: true,
        priority: true,
        status: true,
        assignmentDate: true,
      },
    }),
    followUpService.listOverdueFollowUps(user, teamMemberIds),
    followUpService.listUpcomingFollowUps(user, teamMemberIds, 5),
    followUpService.countFollowUpsDueBetween(user, teamMemberIds, now, endOfToday(now)),
  ]);

  const resolvedCount = convertedCount + lostCount;
  const conversionRate =
    resolvedCount > 0 ? Number(((convertedCount / resolvedCount) * 100).toFixed(1)) : 0;

  return {
    scope: resolveScope(user),
    totalLeads: total,
    openLeads: openCount, // still being worked (not converted / lost)
    newLeads: newCount, // assigned but not yet contacted
    resolvedCount, // converted + lost
    convertedCount,
    lostCount,
    conversionRate,
    dueTodayCount,
    recentlyAssigned,
    statusBreakdown: statusCounts.map((s) => ({ status: s.status, count: s._count._all })),
    priorityBreakdown: priorityCounts.map((p) => ({
      priority: p.priority,
      count: p._count._all,
    })),
    overdueFollowUps: overdue,
    upcomingFollowUps: upcoming,
  };
}

module.exports = { getDashboardData, resolveScope };
