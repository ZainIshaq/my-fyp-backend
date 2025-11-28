const express = require("express")
const router = express.Router()
const {
  create_notification,
  get_all_notifications,
  get_notification_by_id,
  update_notification,
  delete_notification,
  mark_as_read,
  mark_all_as_read,
  get_unread_count,
} = require("../controllers/notification")

// Create a new notification
router.post("/create", create_notification)

// Get all notifications with optional filtering and pagination
router.get("/all", get_all_notifications)

// Get notification by ID
router.get("/:id", get_notification_by_id)

// Update notification
router.put("/update/:id", update_notification)

// Delete notification
router.delete("/delete/:id", delete_notification)

// Mark notification as read
router.patch("/read/:id", mark_as_read)

// Mark all notifications as read
router.patch("/read-all", mark_all_as_read)

// Get unread notifications count
router.get("/count/unread", get_unread_count)

module.exports = router
