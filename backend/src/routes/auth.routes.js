const router = require("express").Router();
const authController = require("../controllers/auth.controller");
const authenticate = require("../middleware/authenticate");

router.post("/login", authController.login);
router.post("/refresh", authController.refresh);
router.get("/me", authenticate, authController.me);

module.exports = router;
