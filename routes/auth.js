// routes/auth.js

const express = require("express");
const router = express.Router();
const db = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer"); // 👈 Re-added for sending emails
const crypto = require("crypto");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");

// =================================================================
// ✨ STEP 1: CONFIGURE EMAIL TRANSPORTER ✨
// =================================================================
// This uses your Gmail App Password from the .env file.
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // your email address from .env
    pass: process.env.EMAIL_PASS, // your 16-character app password from .env
  },
});


// =================================================================
// ✨ STEP 2: REGISTRATION FLOW WITH EMAIL OTP ✨
// =================================================================

// ✅ ROUTE 1: Send OTP for Registration via Email
router.post("/register/send-otp", async (req, res) => {
  // 👈 Reverted to not require phone_number
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: "All fields are required." });
  }

  const findUserSql = "SELECT * FROM users WHERE email = ?";
  db.query(findUserSql, [email], async (err, results) => {
    if (err) {
      console.error("DB Error:", err);
      return res.status(500).json({ error: "Server error." });
    }

    if (results.length > 0 && results[0].is_verified) {
      return res.status(409).json({ error: "Email already registered and verified." });
    }

    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const otp = crypto.randomBytes(3).toString('hex').toUpperCase(); // Generates a 6-character alphanumeric OTP
      const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // OTP expires in 10 minutes

      let sql, params;
      if (results.length > 0 && !results[0].is_verified) {
        // User exists but is not verified, update their info and new OTP
        sql = "UPDATE users SET name = ?, password = ?, role = ?, otp = ?, otp_expires = ? WHERE email = ?";
        params = [name, hashedPassword, role || "user", otp, otpExpires, email];
      } else {
        // New user registration
        sql = "INSERT INTO users (name, email, password, role, otp, otp_expires) VALUES (?, ?, ?, ?, ?, ?)";
        params = [name, email, hashedPassword, role || "user", otp, otpExpires];
      }

      db.query(sql, params, (err, result) => {
        if (err) {
          console.error("DB Error on user insert/update:", err);
          return res.status(500).json({ error: "Failed to process registration." });
        }

        // ✨ --- SEND OTP EMAIL --- ✨
        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: email, // Send to the user's email address
          subject: 'Your Verification Code for ProjectTriangle',
          html: `
            <div style="font-family: Arial, sans-serif; text-align: center; color: #333;">
              <h2>Welcome to ProjectTriangle!</h2>
              <p>Thank you for registering. Please use the following One-Time Password (OTP) to verify your account:</p>
              <p style="font-size: 24px; font-weight: bold; letter-spacing: 2px; margin: 20px; padding: 10px; background-color: #f0f0f0; border-radius: 5px;">${otp}</p>
              <p>This code will expire in 10 minutes.</p>
            </div>
          `,
        };

        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            console.error('Error sending email:', error);
            return res.status(500).json({ error: 'Failed to send OTP email.' });
          }
          console.log('OTP Email sent: ' + info.response);
          res.status(200).json({ message: "OTP sent to your email. Please verify to complete registration." });
        });
      });
    } catch (error) {
      console.error("Hashing error:", error);
      res.status(500).json({ error: "Failed to process registration." });
    }
  });
});


// ✅ ROUTE 2: Verify OTP and Finalize Registration
router.post("/register/verify-otp", (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ error: "Email and OTP are required." });
  }

  const sql = "SELECT * FROM users WHERE email = ?";
  db.query(sql, [email], (err, results) => {
    if (err) {
      console.error("DB Error (find user):", err); // <-- Added logging
      return res.status(500).json({ error: "Server error." });
    }
    if (results.length === 0) {
      return res.status(400).json({ error: "User not found." });
    }

    const user = results[0];

    if (user.is_verified) {
      return res.status(400).json({ error: "Account already verified." });
    }

    if (user.otp !== otp || new Date() > new Date(user.otp_expires)) {
      return res.status(400).json({ error: "Invalid or expired OTP." });
    }

    // OTP is correct, finalize registration
    db.beginTransaction(err => {
      if (err) {
        console.error("DB Error (beginTransaction):", err); // <-- Added logging
        return res.status(500).json({ error: "Server error." });
      }

      const updateUserSql = "UPDATE users SET is_verified = 1, otp = NULL, otp_expires = NULL WHERE id = ?";
      db.query(updateUserSql, [user.id], (err, result) => {
        if (err) {
          console.error("DB Error (update user):", err); // <-- Added logging
          return db.rollback(() => res.status(500).json({ error: "Failed to verify user." }));
        }

        // Create the user's profile
        const createProfileSql = "INSERT INTO profiles (user_id, bio) VALUES (?, ?)";
        db.query(createProfileSql, [user.id, `Welcome to my profile!`], (err, result) => {
          if (err) {
            console.error("DB Error (create profile):", err); // <-- THIS IS THE MOST IMPORTANT LOG
            return db.rollback(() => res.status(500).json({ error: "Failed to create user profile." }));
          }

          db.commit(err => {
            if (err) {
              console.error("DB Error (commit):", err); // <-- Added logging
              return db.rollback(() => res.status(500).json({ error: "Registration commit failed." }));
            }

            // Successfully verified, automatically log them in
            const token = jwt.sign(
              { id: user.id, name: user.name, email: user.email, role: user.role },
              process.env.JWT_SECRET,
              { expiresIn: "7d" }
            );

            res.cookie("token", token, {
              httpOnly: true,
              secure: process.env.NODE_ENV === "production",
              sameSite: "strict",
              maxAge: 7 * 24 * 60 * 60 * 1000,
            });

            res.status(201).json({
              message: "Account verified and registered successfully!",
              user: { id: user.id, name: user.name, email: user.email, role: user.role }
            });
          });
        });
      });
    });
  });
});



// =================================================================
// ✨ STEP 3: LOGIN ROUTE ✨
// =================================================================
router.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const sql = "SELECT * FROM users WHERE email = ?";
  db.query(sql, [email], async (err, results) => {
    if (err) {
      console.error("Login query error:", err);
      return res.status(500).json({ error: "Server error during login." });
    }

    if (results.length === 0) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const user = results[0];

    if (!user.is_verified) {
      return res.status(403).json({ error: "Please verify your email address before logging in." });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      message: "Login successful",
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  });
});


// =================================================================
// EXISTING ROUTES
// =================================================================

router.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.status(200).json({ message: "Logged out successfully" });
});

router.get("/me", protect, (req, res) => {
  return res.status(200).json({
    user: req.user,
  });
});

router.get(
  "/admin-only",
  protect,
  authorizeRoles("admin"),
  (req, res) => {
    res.json({ message: "Welcome Admin, you have access!" });
  }
);

module.exports = router;
