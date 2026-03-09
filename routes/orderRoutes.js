const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { protect } = require("../middleware/authMiddleware");

// GET a single order by its ID
router.get("/:orderId", protect, (req, res) => {
    const { orderId } = req.params;
    const userId = req.user.id;

    const sql = `
        SELECT o.*, pl.title as project_title, buyer.name as buyer_name, seller.name as seller_name
        FROM orders o
        JOIN project_listings pl ON o.project_id = pl.id
        JOIN users buyer ON o.buyer_id = buyer.id
        JOIN users seller ON o.seller_id = seller.id
        WHERE o.id = ? AND (o.buyer_id = ? OR o.seller_id = ?)
    `;

    db.query(sql, [orderId, userId, userId], (err, results) => {
        if (err) return res.status(500).json({ error: "Database error." });
        if (results.length === 0) {
            return res.status(404).json({ error: "Order not found or access denied." });
        }
        res.json(results[0]);
    });
});

// Seller marks an order as "Delivered" and notifies the buyer
router.put("/:orderId/deliver", protect, (req, res) => {
    const { orderId } = req.params;
    const { delivery_details } = req.body;
    const sellerId = req.user.id;

    if (!delivery_details) {
        return res.status(400).json({ error: 'Delivery details are required.' });
    }

    const getOrderSql = `
        SELECT o.buyer_id, pl.title as project_title 
        FROM orders o JOIN project_listings pl ON o.project_id = pl.id
        WHERE o.id = ? AND o.seller_id = ?
    `;
    db.query(getOrderSql, [orderId, sellerId], (err, orders) => {
        if (err || orders.length === 0) {
            return res.status(404).json({ error: 'Order not found or you are not the seller.' });
        }
        const order = orders[0];
        const buyerId = order.buyer_id;

        const updateOrderSql = "UPDATE orders SET order_status = 'Delivered', delivery_details = ? WHERE id = ?";
        db.query(updateOrderSql, [delivery_details, orderId], (updateErr, result) => {
            if (updateErr) return res.status(500).json({ error: "Database error updating order." });

            const notificationMessage = `${req.user.name} has delivered your project "${order.project_title}".`;
            const notificationLink = `/orders/${orderId}`;
            const notificationSql = `
                INSERT INTO notifications (recipient_id, actor_id, type, message, link)
                VALUES (?, ?, 'project_delivered', ?, ?)
            `;
            db.query(notificationSql, [buyerId, sellerId, notificationMessage, notificationLink], (notificationErr) => {
                if (notificationErr) {
                    console.error("Error creating 'project delivered' notification:", notificationErr);
                }
                // ✨ FIX: Response is now sent AFTER notification query finishes.
                res.json({ message: 'Order marked as delivered.' });
            });
        });
    });
});

// Buyer marks an order as "Completed" and notifies the seller
router.put("/:orderId/complete", protect, (req, res) => {
    const { orderId } = req.params;
    const buyerId = req.user.id;

    const getOrderSql = `
        SELECT o.seller_id, pl.title as project_title, u.name as buyer_name
        FROM orders o
        JOIN project_listings pl ON o.project_id = pl.id
        JOIN users u ON o.buyer_id = u.id
        WHERE o.id = ? AND o.buyer_id = ?
    `;
    db.query(getOrderSql, [orderId, buyerId], (err, orders) => {
        if (err || orders.length === 0) {
            return res.status(404).json({ error: 'Order not found or you are not the buyer.' });
        }

        const order = orders[0];
        const sellerId = order.seller_id;

        const updateSql = "UPDATE orders SET order_status = 'Completed', completed_at = CURRENT_TIMESTAMP WHERE id = ?";
        db.query(updateSql, [orderId], (updateErr, result) => {
            if (updateErr) return res.status(500).json({ error: "Database error." });
            
            // Create "order_completed" notification for the seller
            const notificationMessage = `Your sale of "${order.project_title}" to ${order.buyer_name} has been completed.`;
            const notificationLink = `/orders/${orderId}`;
            const notificationSql = `
                INSERT INTO notifications (recipient_id, actor_id, type, message, link)
                VALUES (?, ?, 'order_completed', ?, ?)
            `;
            const notificationValues = [sellerId, buyerId, notificationMessage, notificationLink];
            db.query(notificationSql, notificationValues, (notificationErr) => {
                if (notificationErr) console.error("Error creating 'order completed' notification:", notificationErr);
            });

            res.json({ message: 'Order marked as completed.' });
        });
    });
});

module.exports = router;
