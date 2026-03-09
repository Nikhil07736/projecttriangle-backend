const express = require("express");
const router = express.Router();
const db = require("../config/db");

// ✅ Fetch all messages in a conversation
router.get("/:conversationId/messages", async (req, res) => {
  const { conversationId } = req.params;
  try {
    const [messages] = await db
      .promise()
      .query(
        "SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC",
        [conversationId]
      );
    res.json(messages);
  } catch (err) {
    console.error("Error fetching messages:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Send message directly via this route
router.post("/:conversationId", async (req, res) => {
  const { conversationId } = req.params;
  const { message_text } = req.body;
  const sender_id = req.user?.id || req.body.sender_id;
  try {
    const [participants] = await db
      .promise()
      .query(
        "SELECT user1_id, user2_id FROM conversations WHERE id = ?",
        [conversationId]
      );
    if (!participants.length)
      return res.status(404).json({ error: "Conversation not found" });

    const { user1_id, user2_id } = participants[0];
    const receiver_id = user1_id === sender_id ? user2_id : user1_id;

    await db
      .promise()
      .query(
        "INSERT INTO messages (conversation_id, sender_id, receiver_id, message_text) VALUES (?, ?, ?, ?)",
        [conversationId, sender_id, receiver_id, message_text]
      );

    const [messages] = await db
      .promise()
      .query(
        "SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 1",
        [conversationId]
      );
    const newMessage = messages[0];

    if (req.io && newMessage) {
      const room = `conversation-${conversationId}`;
      req.io.to(room).emit("receive_message", newMessage);
      req.io.to(`user-${receiver_id}`).emit("new_message_notification", {
        message: "You have a new message",
        conversationId,
        senderId: sender_id,
      });
      req.io.to(`user-${sender_id}`).emit("receive_message", newMessage);
    }

    res.status(201).json({ message: "Message sent", data: newMessage });
  } catch (err) {
    console.error("Error sending message:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
