const router = require("express").Router();
const { asyncHandler } = require("../utils/http");
const { listNotifications, markNotificationRead } = require("../services/notification.service");

router.get("/", asyncHandler(async (req, res) => {
  const notifications = await listNotifications(req.user);
  res.json(notifications);
}));

router.post("/:notificationId/read", asyncHandler(async (req, res) => {
  const notification = await markNotificationRead(req.user, req.params.notificationId);
  if (!notification) {
    return res.status(404).json({ error: { message: "Notification not found." } });
  }
  res.json(notification);
}));

module.exports = router;
