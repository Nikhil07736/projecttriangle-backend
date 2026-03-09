const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { protect } = require("../middleware/authMiddleware");

/**
 * @route   GET /api/notifications
 * @desc    Get all notifications for the logged-in user
 * @access  Private
 */
router.get("/", protect, (req, res) => {
  const userId = req.user.id;

  // We also get an unread_count for the notification bell badge
  const sql = `
    SELECT 
      *,
      (SELECT COUNT(*) FROM notifications WHERE recipient_id = ? AND is_read = FALSE) as unread_count
    FROM notifications 
    WHERE recipient_id = ? 
    ORDER BY created_at DESC
  `;

  db.query(sql, [userId, userId], (err, results) => {
    if (err) {
      console.error("Error fetching notifications:", err);
      return res.status(500).json({ error: "Database error." });
    }
    
    // Structure the response
    const unreadCount = results.length > 0 ? results[0].unread_count : 0;
    const notifications = results.map(n => {
        // remove the count from each individual notification object
        const { unread_count, ...notification } = n;
        return notification;
    });

    res.json({
        unreadCount,
        notifications
    });
  });
});

/**
 * @route   PUT /api/notifications/:notificationId/read
 * @desc    Mark a single notification as read
 * @access  Private
 */
router.put("/:notificationId/read", protect, (req, res) => {
  const { notificationId } = req.params;
  const userId = req.user.id;

  // We include `recipient_id` in the WHERE clause to ensure
  // users can only mark their own notifications as read.
  const sql = "UPDATE notifications SET is_read = TRUE WHERE id = ? AND recipient_id = ?";

  db.query(sql, [notificationId, userId], (err, result) => {
    if (err) {
      console.error("Error marking notification as read:", err);
      return res.status(500).json({ error: "Database error." });
    }
    if (result.affectedRows === 0) {
      // This can happen if the notification doesn't exist or doesn't belong to the user
      return res.status(404).json({ message: "Notification not found or access denied." });
    }
    res.status(200).json({ message: "Notification marked as read." });
  });
});

/**
 * @route   POST /api/notifications/mark-as-read
 * @desc    Mark all notifications as read for the logged-in user
 * @access  Private
 */
router.post("/mark-as-read", protect, (req, res) => {
  const userId = req.user.id;

  const sql = "UPDATE notifications SET is_read = TRUE WHERE recipient_id = ?";

  db.query(sql, [userId], (err, result) => {
    if (err) {
      console.error("Error marking notifications as read:", err);
      return res.status(500).json({ error: "Database error." });
    }
    res.status(200).json({ message: "Notifications marked as read." });
  });
});

module.exports = router;