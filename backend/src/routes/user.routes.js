const router = require("express").Router();
const userController = require("../controllers/user.controller");
const authorize = require("../middleware/authorize");
const { PERMISSIONS } = require("../config/permissions");

router.get("/assignable", authorize(PERMISSIONS.LEAD_ASSIGN, PERMISSIONS.LEAD_REASSIGN), userController.listAssignable);

router.use(authorize(PERMISSIONS.USER_MANAGE));
router.get("/", userController.list);
router.post("/", userController.create);
router.patch("/:userId", userController.update);
router.post("/:userId/deactivate", userController.deactivate);

module.exports = router;
