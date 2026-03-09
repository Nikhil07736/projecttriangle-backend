// backend/routes/conversationRoutes.js

const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { protect } = require("../middleware/authMiddleware");

// Helper function rewritten with callbacks
function ensureConversationExists({ orderId, proposalId }, callback) {
  if (orderId) {
    db.query("SELECT * FROM conversations WHERE order_id = ?", [orderId], (err, rows) => {
      if (err) return callback(err);
      if (rows.length > 0) return callback(null, rows[0]);

      db.query("SELECT buyer_id, seller_id FROM orders WHERE id = ?", [orderId], (err, orderRows) => {
        if (err) return callback(err);
        if (orderRows.length === 0) return callback(new Error("Order not found"));
        
        const { buyer_id, seller_id } = orderRows[0];
        
        db.query("INSERT INTO conversations (order_id) VALUES (?)", [orderId], (err, insert) => {
          if (err) return callback(err);
          const conversationId = insert.insertId;
          
          db.query("INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?), (?, ?)", [conversationId, buyer_id, conversationId, seller_id], (err) => {
            if (err) return callback(err);
            
            db.query("SELECT * FROM conversations WHERE id = ?", [conversationId], (err, created) => {
              if (err) return callback(err);
              callback(null, created[0]);
            });
          });
        });
      });
    });
  } else if (proposalId) {
    db.query("SELECT * FROM conversations WHERE proposal_id = ?", [proposalId], (err, rows) => {
        if (err) return callback(err);
        if (rows.length > 0) return callback(null, rows[0]);

        db.query("SELECT freelancer_id, client_id FROM proposals WHERE id = ?", [proposalId], (err, proposalRows) => {
            if (err) return callback(err);
            if (proposalRows.length === 0) return callback(new Error("Proposal not found"));

            const { freelancer_id, client_id } = proposalRows[0];

            db.query("INSERT INTO conversations (proposal_id) VALUES (?)", [proposalId], (err, insert) => {
                if (err) return callback(err);
                const conversationId = insert.insertId;

                db.query("INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?), (?, ?)", [conversationId, freelancer_id, conversationId, client_id], (err) => {
                    if (err) return callback(err);

                    db.query("SELECT * FROM conversations WHERE id = ?", [conversationId], (err, created) => {
                        if (err) return callback(err);
                        callback(null, created[0]);
                    });
                });
            });
        });
    });
  } else {
      return callback(new Error("No orderId or proposalId provided"));
  }
}

// GET /by-order/:orderId
router.get("/by-order/:orderId", protect, (req, res) => {
  const userId = req.user.id;
  const { orderId } = req.params;
  ensureConversationExists({ orderId }, (err, conversation) => {
    if (err || !conversation) return res.status(500).json({ message: err ? err.message : "Conversation not found" });
    db.query("SELECT * FROM conversation_participants WHERE conversation_id = ? AND user_id = ?", [conversation.id, userId], (err, access) => {
      if (err) return res.status(500).json({ message: "Server error" });
      if (access.length === 0) return res.status(403).json({ message: "Access denied" });
      res.json(conversation);
    });
  });
});

// GET /by-proposal/:proposalId
router.get("/by-proposal/:proposalId", protect, (req, res) => {
    const userId = req.user.id;
    const { proposalId } = req.params;
    ensureConversationExists({ proposalId }, (err, conversation) => {
        if (err || !conversation) return res.status(500).json({ message: err ? err.message : "Conversation not found" });
        db.query("SELECT * FROM conversation_participants WHERE conversation_id = ? AND user_id = ?", [conversation.id, userId], (err, access) => {
            if (err) return res.status(500).json({ message: "Server error" });
            if (access.length === 0) return res.status(403).json({ message: "Access denied" });
            res.json(conversation);
        });
    });
});

// GET /:conversationId/messages
router.get("/:conversationId/messages", protect, (req, res) => {
    const { conversationId } = req.params;
    const userId = req.user.id;
    db.query("SELECT * FROM conversation_participants WHERE conversation_id = ? AND user_id = ?", [conversationId, userId], (err, access) => {
        if (err) return res.status(500).json({ message: "Server error" });
        if (access.length === 0) return res.status(403).json({ message: "Access denied" });
        db.query("SELECT * FROM messages WHERE conversation_id = ? ORDER BY sent_at ASC", [conversationId], (err, messages) => {
            if (err) return res.status(500).json({ message: "Server error" });
            res.json(messages);
        });
    });
});

// POST /:conversationId/messages
router.post("/:conversationId/messages", protect, (req, res) => {
    const { conversationId } = req.params;
    const { message_text } = req.body;
    const sender_id = req.user.id;

    if (!message_text) {
        return res.status(400).json({ message: "Message text is required" });
    }

    // First, find the receiver
    db.query("SELECT user_id FROM conversation_participants WHERE conversation_id = ? AND user_id != ?", [conversationId, sender_id], (err, participants) => {
        if (err || participants.length === 0) {
            return res.status(500).json({ message: "Could not find conversation participant." });
        }
        const receiverId = participants[0].user_id;

        // Now, insert the message with the receiver_id
        const insertQuery = "INSERT INTO messages (conversation_id, sender_id, receiver_id, message_text) VALUES (?, ?, ?, ?)";
        db.query(insertQuery, [conversationId, sender_id, receiverId, message_text], (err, insertResult) => {
            if (err) {
                console.error("Error sending message (insert):", err);
                return res.status(500).json({ message: "Server error" });
            }

            const newMessageId = insertResult.insertId;
            db.query("SELECT * FROM messages WHERE id = ?", [newMessageId], (err, rows) => {
                if (err || rows.length === 0) {
                    return res.status(201).json({ message: "Message sent but failed to broadcast" });
                }
                
                const newMessage = rows[0];
                const io = req.io;

                io.to(`conversation-${conversationId}`).emit("receive_message", newMessage);
                io.to(`user-${receiverId}`).emit('new_message_notification', {
                    message: `You have a new message`,
                    conversationId: conversationId
                });
                
                res.status(201).json({ message: "Message sent successfully", data: newMessage });
            });
        });
    });
});

// GET /my-conversations
router.get("/my-conversations", protect, (req, res) => {
    const userId = req.user.id;
    const query = `
        SELECT c.id, c.order_id, c.proposal_id, other_user.name AS other_participant_name 
        FROM conversations AS c
        JOIN conversation_participants AS cp1 ON c.id = cp1.conversation_id
        JOIN conversation_participants AS cp2 ON c.id = cp2.conversation_id
        JOIN users AS other_user ON cp2.user_id = other_user.id
        WHERE cp1.user_id = ? AND cp2.user_id != ?
        ORDER BY c.id DESC`;

    db.query(query, [userId, userId], (err, results) => {
        if (err) return res.status(500).json({ message: "Server error" });
        res.json(results);
    });
});

// GET /:conversationId
router.get("/:conversationId", protect, (req, res) => {
    const { conversationId } = req.params;
    const userId = req.user.id;
    const query = `
        SELECT c.id, other_user.name AS other_participant_name
        FROM conversations AS c
        JOIN conversation_participants AS cp ON c.id = cp.conversation_id
        JOIN users AS other_user ON cp.user_id = other_user.id
        WHERE c.id = ? AND cp.user_id != ?
        LIMIT 1`;

    db.query(query, [conversationId, userId], (err, results) => {
        if (err) return res.status(500).json({ message: "Server error" });
        if (results.length === 0) return res.status(404).json({ message: "Conversation not found." });
        res.json(results[0]);
    });
});

module.exports = router;