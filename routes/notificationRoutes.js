const express = require("express");
const router = express.Router();
const { protect, admin } = require("../middleware/authMiddleware");
const notificationController = require("../controllers/notificationController");

// Protect all routes
router.use(protect);

// Notification routes
router.get("/", notificationController.getNotifications);
router.get("/unread", notificationController.getUnreadNotifications);
router.get("/:id", notificationController.getNotificationById);
router.put("/:id/read", notificationController.markAsRead);
router.delete("/:id", admin, notificationController.deleteNotification);

module.exports = router;
