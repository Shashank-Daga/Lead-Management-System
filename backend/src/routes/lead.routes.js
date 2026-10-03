const router = require("express").Router();
const leadController = require("../controllers/lead.controller");
const authorize = require("../middleware/authorize");
const { PERMISSIONS } = require("../config/permissions");

const VIEW_ANY = [
  PERMISSIONS.LEAD_VIEW_ALL,
  PERMISSIONS.LEAD_VIEW_SCOPED,
  PERMISSIONS.LEAD_VIEW_ASSIGNED,
];
const EDIT_ANY = [
  PERMISSIONS.LEAD_EDIT_ALL,
  PERMISSIONS.LEAD_EDIT_SCOPED,
  PERMISSIONS.LEAD_EDIT_ASSIGNED,
];
const HISTORY_ANY = [
  PERMISSIONS.HISTORY_VIEW_ALL,
  PERMISSIONS.HISTORY_VIEW_SCOPED,
  PERMISSIONS.HISTORY_VIEW_ASSIGNED,
];
const FOLLOWUP_ANY = [PERMISSIONS.FOLLOWUP_MANAGE_ALL, PERMISSIONS.FOLLOWUP_MANAGE_ASSIGNED];

// Every route below sits behind `authenticate` (applied once in app.js) plus
// a permission check here. Fine-grained "is this specific lead in my scope"
// enforcement happens inside the service layer (see leadScope.service.js) —
// route-level authorize() only gatekeeps the *operation type*.
router.post("/", authorize(PERMISSIONS.LEAD_CREATE), leadController.create);
router.get("/", authorize(...VIEW_ANY), leadController.list);
router.get("/:leadId", authorize(...VIEW_ANY), leadController.getById);
router.patch("/:leadId", authorize(...EDIT_ANY), leadController.update);
router.delete("/:leadId", authorize(PERMISSIONS.LEAD_DELETE), leadController.remove);

router.post("/:leadId/status", authorize(PERMISSIONS.LEAD_CHANGE_STATUS), leadController.changeStatus);
router.post(
  "/:leadId/priority",
  authorize(PERMISSIONS.LEAD_CHANGE_PRIORITY),
  leadController.changePriority
);
router.post(
  "/:leadId/assign",
  authorize(PERMISSIONS.LEAD_ASSIGN, PERMISSIONS.LEAD_REASSIGN),
  leadController.assign
);

router.get("/:leadId/history", authorize(...HISTORY_ANY), leadController.history);

router.get("/:leadId/notes", authorize(...VIEW_ANY), leadController.listNotes);
router.post("/:leadId/notes", authorize(PERMISSIONS.LEAD_ADD_NOTE), leadController.addNote);
router.patch("/:leadId/notes/:noteId", authorize(PERMISSIONS.LEAD_ADD_NOTE), leadController.updateNote);
router.delete("/:leadId/notes/:noteId", authorize(PERMISSIONS.LEAD_ADD_NOTE), leadController.deleteNote);

router.get("/:leadId/follow-ups", authorize(...VIEW_ANY), leadController.listFollowUps);
router.post("/:leadId/follow-ups", authorize(...FOLLOWUP_ANY), leadController.createFollowUp);
router.patch(
  "/:leadId/follow-ups/:followUpId",
  authorize(...FOLLOWUP_ANY),
  leadController.updateFollowUp
);
router.delete(
  "/:leadId/follow-ups/:followUpId",
  authorize(...FOLLOWUP_ANY),
  leadController.deleteFollowUp
);

module.exports = router;
