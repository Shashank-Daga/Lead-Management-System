const dashboardService = require("../services/dashboard.service");
const exportService = require("../services/export.service");
const { asyncHandler } = require("../utils/http");

const getDashboard = asyncHandler(async (req, res) => {
  const data = await dashboardService.getDashboardData(req.user);
  res.json(data);
});

const exportCsv = asyncHandler(async (req, res) => {
  const csv = await exportService.exportLeadsCsv(req.user);
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="leads-export.csv"`);
  res.send(csv);
});

module.exports = { getDashboard, exportCsv };
