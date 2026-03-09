// --- DEPENDENCIES ---
const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { nanoid } = require('nanoid');
const db = require('../config/db');
const { protect } = require('../middleware/authMiddleware');

// --- RAZORPAY INSTANCE ---
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// --- API ROUTES ---

/**
 * @route   POST /api/payment/order
 * @desc    Create a Razorpay order
 * @access  Private (Requires Login)
 */
router.post('/order', protect, async (req, res) => {
  const { amount, currency = 'INR' } = req.body;

  if (!amount) {
    return res.status(400).json({ error: 'Amount is required.' });
  }

  const options = {
    amount: Math.round(amount * 100),
    currency,
    receipt: `receipt_order_${nanoid(8)}`,
  };

  try {
    const order = await razorpay.orders.create(options);
    res.json(order);
  } catch (error) {
    console.error("❌ Error creating Razorpay order:", error);
    res.status(500).json({ error: "Could not create payment order." });
  }
});


/**
 * @route   POST /api/payment/verify
 * @desc    Verify payment for a marketplace project, create an order, and notify the seller.
 * @access  Private (Requires Login)
 */
router.post('/verify', protect, async (req, res) => {
    const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        project
    } = req.body;

    const buyer_id = req.user.id;
    const buyer_name = req.user.name;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !project) {
        return res.status(400).json({ error: 'Missing required payment details.' });
    }

    try {
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest("hex");

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ error: 'Payment verification failed. Invalid signature.' });
        }
        
        console.log("✅ Payment signature verified successfully.");
        
        const seller_id = project.user_id;
        const amount_in_rupees = project.price;
        const commission = amount_in_rupees * 0.15;

        const createOrderSql = `
            INSERT INTO orders (project_id, buyer_id, seller_id, razorpay_payment_id, razorpay_order_id, razorpay_signature, amount, commission, order_status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pending Delivery')
        `;
        const values = [project.id, buyer_id, seller_id, razorpay_payment_id, razorpay_order_id, razorpay_signature, amount_in_rupees, commission];

        db.query(createOrderSql, values, (err, result) => {
            if (err) {
                console.error("❌ Error creating order in DB:", err);
                return res.status(500).json({ error: 'Payment was successful but we failed to create your order record. Please contact support.' });
            }
            
            const newOrderId = result.insertId;
            console.log(`✅ Order ${newOrderId} created for buyer ${buyer_id}.`);
            
            // --- CREATE TIME-LIMITED CONVERSATION & NOTIFICATION ---

            // 1. Calculate expiration date (14 days from now)
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 14);

            // 2. Create the conversation
            const createConversationSql = 'INSERT INTO conversations (order_id, expires_at) VALUES (?, ?)';
            db.query(createConversationSql, [newOrderId, expiresAt], (convErr, convResult) => {
                if (convErr) {
                    console.error("Error creating order conversation:", convErr);
                } else {
                    const conversationId = convResult.insertId;
                    const participantsSql = 'INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?), (?, ?)';
                    const participantsValues = [conversationId, buyer_id, conversationId, seller_id];
                    db.query(participantsSql, participantsValues, (partErr) => {
                        if (partErr) console.error("Error adding participants to order conversation:", partErr);
                    });
                }
            });

            // 3. Create the "new_order" notification for the seller
            const notificationMessage = `${buyer_name} has purchased your project "${project.title}".`;
            const notificationLink = `/orders/${newOrderId}`;
            const notificationSql = `
                INSERT INTO notifications (recipient_id, actor_id, type, message, link)
                VALUES (?, ?, 'new_order', ?, ?)
            `;
            const notificationValues = [seller_id, buyer_id, notificationMessage, notificationLink];
            db.query(notificationSql, notificationValues, (notificationErr) => {
                if (notificationErr) {
                    console.error("Error creating 'new order' notification:", notificationErr);
                }
            });
            
            res.json({ status: 'success', message: 'Payment verified and order created.' });
        });
    } catch (error) {
        console.error("❌ Error during payment verification:", error);
        res.status(500).json({ error: 'Internal server error during payment verification.' });
    }
});

module.exports = router;
