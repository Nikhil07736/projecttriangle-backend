const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { protect } = require("../middleware/authMiddleware");

router.get("/my-content", protect, (req, res) => {
  const userId = req.user.id;
  let userContent = {};

  const listingsQuery = "SELECT * FROM project_listings WHERE user_id = ? ORDER BY created_at DESC";
  db.query(listingsQuery, [userId], (err, listings) => {
    if (err) return res.status(500).json({ error: "DB error fetching listings" });
    userContent.marketplaceListings = listings;

    const jobsQuery = `
      SELECT p.*, COUNT(pr.id) as proposal_count
      FROM projects p
      LEFT JOIN proposals pr ON p.id = pr.project_id
      WHERE p.user_id = ?
      GROUP BY p.id
      ORDER BY p.id DESC
    `;
    db.query(jobsQuery, [userId], (err, jobs) => {
      if (err) return res.status(500).json({ error: "DB error fetching jobs" });
      userContent.postedJobs = jobs;

      const purchasesQuery = `
        SELECT o.*, pl.title as project_title, u.name as seller_name
        FROM orders o
        JOIN project_listings pl ON o.project_id = pl.id
        JOIN users u ON o.seller_id = u.id
        WHERE o.buyer_id = ? 
        ORDER BY o.created_at DESC
      `;
      db.query(purchasesQuery, [userId], (err, purchases) => {
        if (err) return res.status(500).json({ error: "DB error fetching purchases" });
        userContent.myPurchases = purchases;

        const salesQuery = `
          SELECT o.*, pl.title as project_title, u.name as buyer_name
          FROM orders o
          JOIN project_listings pl ON o.project_id = pl.id
          JOIN users u ON o.buyer_id = u.id
          WHERE o.seller_id = ?
          ORDER BY o.created_at DESC
        `;
        db.query(salesQuery, [userId], (err, sales) => {
          if (err) return res.status(500).json({ error: "DB error fetching sales" });
          userContent.mySales = sales;

          // --- ✨ THIS IS THE CORRECTED QUERY ---
          const proposalsQuery = `
            SELECT 
              pr.*, 
              p.title as project_title,
              (SELECT COUNT(*) 
               FROM messages m
               JOIN conversations c ON m.conversation_id = c.id
               WHERE c.proposal_id = pr.id 
               AND m.is_read = 0 
               AND m.receiver_id = pr.freelancer_id) as unread_messages
            FROM proposals pr
            JOIN projects p ON pr.project_id = p.id
            WHERE pr.freelancer_id = ? 
            ORDER BY pr.submitted_at DESC
          `;
          db.query(proposalsQuery, [userId], (err, proposals) => {
            if (err) {
              console.error("Dashboard proposals query failed:", err);
              return res.status(500).json({ error: "DB error fetching proposals" });
            }
            userContent.myProposals = proposals;
            
            res.json(userContent);
          });
        });
      });
    });
  });
});

module.exports = router;