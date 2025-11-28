const Notification = require("../models/notification")

module.exports = {
  // Create a new notification
  create_notification: async (req, res) => {
    try {
      const { text, priority = "medium" } = req.body

      if (!text || !text.trim()) {
        return res.status(400).json({
          message: "Notification text is required",
        })
      }

      const notification = await Notification.create({
        text: text.trim(),
        priority,
        date: new Date().toISOString().split("T")[0],
      })

      res.status(201).json({
        message: "Notification created successfully",
        notification,
      })
    } catch (error) {
      console.error("Error creating notification:", error)
      res.status(500).json({
        message: "Error creating notification",
        error: error.message,
      })
    }
  },

  // Get all notifications
  get_all_notifications: async (req, res) => {
    try {
      const { page = 1, limit = 10, priority, isRead } = req.query

      const whereClause = {}
      if (priority) whereClause.priority = priority
      if (isRead !== undefined) whereClause.isRead = isRead === "true"

      const offset = (page - 1) * limit

      const { count, rows: notifications } = await Notification.findAndCountAll({
        where: whereClause,
        order: [["createdAt", "DESC"]],
        limit: Number.parseInt(limit),
        offset: Number.parseInt(offset),
      })

      res.status(200).json({
        notifications,
        totalCount: count,
        currentPage: Number.parseInt(page),
        totalPages: Math.ceil(count / limit),
      })
    } catch (error) {
      console.error("Error fetching notifications:", error)
      res.status(500).json({
        message: "Error fetching notifications",
        error: error.message,
      })
    }
  },

  // Get notification by ID
  get_notification_by_id: async (req, res) => {
    try {
      const { id } = req.params

      const notification = await Notification.findByPk(id)

      if (!notification) {
        return res.status(404).json({
          message: "Notification not found",
        })
      }

      res.status(200).json({ notification })
    } catch (error) {
      console.error("Error fetching notification:", error)
      res.status(500).json({
        message: "Error fetching notification",
        error: error.message,
      })
    }
  },

  // Update notification
  update_notification: async (req, res) => {
    try {
      const { id } = req.params
      const { text, priority, isRead } = req.body

      const notification = await Notification.findByPk(id)

      if (!notification) {
        return res.status(404).json({
          message: "Notification not found",
        })
      }

      // Update fields if provided
      if (text !== undefined) notification.text = text.trim()
      if (priority !== undefined) notification.priority = priority
      if (isRead !== undefined) notification.isRead = isRead

      await notification.save()

      res.status(200).json({
        message: "Notification updated successfully",
        notification,
      })
    } catch (error) {
      console.error("Error updating notification:", error)
      res.status(500).json({
        message: "Error updating notification",
        error: error.message,
      })
    }
  },

  // Delete notification
  delete_notification: async (req, res) => {
    try {
      const { id } = req.params

      const notification = await Notification.findByPk(id)

      if (!notification) {
        return res.status(404).json({
          message: "Notification not found",
        })
      }

      await notification.destroy()

      res.status(200).json({
        message: "Notification deleted successfully",
      })
    } catch (error) {
      console.error("Error deleting notification:", error)
      res.status(500).json({
        message: "Error deleting notification",
        error: error.message,
      })
    }
  },

  // Mark notification as read
  mark_as_read: async (req, res) => {
    try {
      const { id } = req.params

      const notification = await Notification.findByPk(id)

      if (!notification) {
        return res.status(404).json({
          message: "Notification not found",
        })
      }

      notification.isRead = true
      await notification.save()

      res.status(200).json({
        message: "Notification marked as read",
        notification,
      })
    } catch (error) {
      console.error("Error marking notification as read:", error)
      res.status(500).json({
        message: "Error marking notification as read",
        error: error.message,
      })
    }
  },

  // Mark all notifications as read
  mark_all_as_read: async (req, res) => {
    try {
      await Notification.update({ isRead: true }, { where: { isRead: false } })

      res.status(200).json({
        message: "All notifications marked as read",
      })
    } catch (error) {
      console.error("Error marking all notifications as read:", error)
      res.status(500).json({
        message: "Error marking all notifications as read",
        error: error.message,
      })
    }
  },

  // Get unread notifications count
  get_unread_count: async (req, res) => {
    try {
      const count = await Notification.count({
        where: { isRead: false },
      })

      res.status(200).json({ unreadCount: count })
    } catch (error) {
      console.error("Error getting unread count:", error)
      res.status(500).json({
        message: "Error getting unread count",
        error: error.message,
      })
    }
  },
}
