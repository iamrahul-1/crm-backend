const Notification = require("../models/notification");
const Lead = require("../models/lead");

// Error handler utility
const handleError = (res, error, message = "Server Error") => {
  console.error(`Error: ${message}`, error);
  return res.status(500).json({ message, error: error.message });
};

// Get all notifications
const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find()
      .populate("lead")
      .sort({ createdAt: -1 });
    res.json(notifications);
  } catch (error) {
    handleError(res, error, "Error getting notifications");
  }
};

// Get unread notifications
const getUnreadNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ isRead: false })
      .populate("lead")
      .sort({ createdAt: -1 });
    res.json(notifications);
  } catch (error) {
    handleError(res, error, "Error getting unread notifications");
  }
};

// Get notification by ID
const getNotificationById = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id)
      .populate("lead");
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }
    res.json(notification);
  } catch (error) {
    handleError(res, error, "Error getting notification");
  }
};

// Mark notification as read
const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }
    notification.isRead = true;
    await notification.save();
    res.json(notification);
  } catch (error) {
    handleError(res, error, "Error marking notification as read");
  }
};

// Delete notification
const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findByIdAndDelete(req.params.id);
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }
    res.json({ message: "Notification deleted successfully" });
  } catch (error) {
    handleError(res, error, "Error deleting notification");
  }
};

module.exports = {
  getNotifications,
  getUnreadNotifications,
  getNotificationById,
  markAsRead,
  deleteNotification
};
