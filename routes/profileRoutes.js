// routes/profileRoutes.js
const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const db = require("../config/db");
const { protect } = require("../middleware/authMiddleware");

// --- Multer Configuration ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "uploads/avatars/";
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = "user-" + req.user.id + "-" + Date.now();
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Not an image! Please upload an image."), false);
    }
  },
  limits: { fileSize: 1024 * 1024 * 5 },
});

// --- API Routes ---

// GET My Profile
router.get("/me", protect, (req, res) => {
  const sql = `
    SELECT u.name, u.email, u.role, p.bio, p.avatar_url, p.skills, p.website_url, p.location 
    FROM users u 
    JOIN profiles p ON u.id = p.user_id 
    WHERE u.id = ?
  `;
  db.query(sql, [req.user.id], (err, results) => {
    if (err) {
      console.error("Error fetching my profile:", err);
      return res.status(500).json({ error: "Server error." });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: "Profile not found." });
    }
    res.json(results[0]);
  });
});

// UPDATE My Profile (text fields only)
router.put("/me", protect, (req, res) => {
  const { bio, skills, website_url, location } = req.body;
  const sql = "UPDATE profiles SET bio = ?, skills = ?, website_url = ?, location = ? WHERE user_id = ?";
  const values = [bio, skills, website_url, location, req.user.id];
  db.query(sql, values, (err, result) => {
    if (err) {
      console.error("Error updating profile:", err);
      return res.status(500).json({ error: "Server error." });
    }
    res.json({ message: "Profile updated successfully." });
  });
});

// ✨ MODIFIED ROUTE: UPLOAD AVATAR ✨
router.put("/avatar", protect, upload.single("avatar"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded." });
  }

  const avatarUrl = `/uploads/avatars/${req.file.filename}`;

  // First, update the profile with the new avatar URL
  const updateSql = "UPDATE profiles SET avatar_url = ? WHERE user_id = ?";
  db.query(updateSql, [avatarUrl, req.user.id], (err, result) => {
    if (err) {
      console.error("Error updating avatar URL in DB:", err);
      return res.status(500).json({ error: "Server error." });
    }

    // Second, fetch the complete updated user data to send back
    const fetchUserSql = `
      SELECT u.id, u.name, u.email, u.role, p.avatar_url 
      FROM users u 
      JOIN profiles p ON u.id = p.user_id 
      WHERE u.id = ?
    `;
    db.query(fetchUserSql, [req.user.id], (fetchErr, fetchResults) => {
      if (fetchErr || fetchResults.length === 0) {
        return res.status(500).json({ error: "Could not fetch updated user data." });
      }
      
      res.json({
        message: "Avatar updated successfully.",
        user: fetchResults[0] // Send back the entire user object
      });
    });
  });
});

// GET Public User Profile by ID
router.get("/:id", (req, res) => {
  const sql = `
    SELECT u.id, u.name, u.role, p.bio, p.avatar_url, p.skills, p.website_url, p.location, u.created_at
    FROM users u
    JOIN profiles p ON u.id = p.user_id
    WHERE u.id = ?
  `;
  db.query(sql, [req.params.id], (err, results) => {
     if (err) {
      console.error("Error fetching public profile:", err);
      return res.status(500).json({ error: "Server error." });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: "User not found." });
    }
    res.json(results[0]);
  });
});

module.exports = router;