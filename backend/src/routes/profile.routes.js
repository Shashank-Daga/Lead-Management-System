const router = require("express").Router();
const profileController = require("../controllers/profile.controller");

// This router is mounted behind authentication in app.js.
// Profile writes never accept another user's ID.
router.get("/", profileController.getMine);
router.patch("/", profileController.updateMine);
router.post("/password", profileController.changePassword);

// Read-only profile directory, restricted by permissions in the service.
router.get("/users", profileController.listVisible);
router.get("/users/:userId", profileController.getVisible);

module.exports = router;
