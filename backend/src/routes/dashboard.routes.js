const router = require("express").Router();
const dashboardController = require("../controllers/dashboard.controller");
const authorize = require("../middleware/authorize");
const { PERMISSIONS } = require("../config/permissions");

// Anyone who can view leads may open a dashboard, because every number on it is
// computed from that same visibility scope (Executive: own leads only, Manager:
// team, Admin: organization). reports.view is still accepted for custom roles.
router.get(
  "/",
  authorize(
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.LEAD_VIEW_ALL,
    PERMISSIONS.LEAD_VIEW_SCOPED,
    PERMISSIONS.LEAD_VIEW_ASSIGNED
  ),
  dashboardController.getDashboard
);
router.get(
  "/export/leads.csv",
  authorize(PERMISSIONS.EXPORT_DATA),
  dashboardController.exportCsv
);

module.exports = router;
