const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { protect } = require("../middleware/authMiddleware");

const multer = require("multer");
const path = require("path");

// ----- Multer storage configuration -----
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // files stored in backend/uploads/
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname); // unique filename
  },
});

const upload = multer({ storage });

// ----- POST - Upload a new project listing -----
router.post(
  "/upload",
  protect,
  upload.fields([
    { name: "cover_image", maxCount: 1 },
    { name: "gallery", maxCount: 10 },
    { name: "project_ppt", maxCount: 1 },
    { name: "abstract_doc", maxCount: 1 },
    { name: "blackbook", maxCount: 1 },
    { name: "literature_survey", maxCount: 1 },
    { name: "video_demo", maxCount: 1 },
  ]),
  (req, res) => {
    const {
      title,
      short_desc,
      long_desc,
      tech_stack,
      tags,
      price,
      demo_link,
      delivery_method,
      license,
    } = req.body;

    if (!title || !price || !delivery_method) {
      return res
        .status(400)
        .json({ error: "Title, price and delivery method are required." });
    }

    const user_id = req.user.id;

    // ----- Convert arrays to string/JSON -----
    const techStackStr = Array.isArray(tech_stack)
      ? JSON.stringify(tech_stack)
      : JSON.stringify([tech_stack || ""]);

    const tagsStr = Array.isArray(tags)
      ? JSON.stringify(tags)
      : JSON.stringify([tags || ""]);

    const cover_image = req.files["cover_image"]
      ? req.files["cover_image"][0].path
      : null;

    const galleryStr = req.files["gallery"]
      ? JSON.stringify(req.files["gallery"].map((f) => f.path))
      : null;

    const project_ppt = req.files["project_ppt"]
      ? req.files["project_ppt"][0].path
      : null;

    const abstract_doc = req.files["abstract_doc"]
      ? req.files["abstract_doc"][0].path
      : null;

    const blackbook = req.files["blackbook"]
      ? req.files["blackbook"][0].path
      : null;

    const literature_survey = req.files["literature_survey"]
      ? req.files["literature_survey"][0].path
      : null;

    const video_demo = req.files["video_demo"]
      ? req.files["video_demo"][0].path
      : null;

    const sql = `
      INSERT INTO project_listings
      (user_id, title, short_desc, long_desc, tech_stack, tags, price, demo_link, delivery_method,
       cover_image, gallery, project_ppt, abstract_doc, blackbook, literature_survey, license, video_demo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      user_id,
      title,
      short_desc,
      long_desc,
      techStackStr,
      tagsStr,
      price,
      demo_link,
      delivery_method,
      cover_image,
      galleryStr,
      project_ppt,
      abstract_doc,
      blackbook,
      literature_survey,
      license || "Educational Use Only",
      video_demo,
    ];

    db.query(sql, values, (err, result) => {
      if (err) {
        console.error("❌ Error inserting project:", err);
        return res.status(500).json({ error: "Database error" });
      }
      res.json({ success: true, projectId: result.insertId });
    });
  }
);

// This handles requests for a single project by its ID
router.get("/project/:id", (req, res) => {
  const projectId = req.params.id;
  const sql = `
    SELECT pl.*, u.name as seller_name 
    FROM project_listings pl
    JOIN users u ON pl.user_id = u.id
    WHERE pl.id = ?
  `;

  db.query(sql, [projectId], (err, results) => {
    if (err) {
      console.error("❌ Error fetching single project:", err);
      return res.status(500).json({ error: "Database error" });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: "Project not found" });
    }
    res.json(results[0]);
  });
});
// ----- GET - Explore all projects -----
router.get("/explore", (req, res) => {
  db.query(
    "SELECT * FROM project_listings ORDER BY created_at DESC",
    (err, results) => {
      if (err) {
        console.error("❌ Error fetching projects:", err);
        return res.status(500).json({ error: "Database error" });
      }
      res.json(results);
    }
  );
});

// ----- GET - My projects (for logged-in user) -----
router.get("/my-projects", protect, (req, res) => {
  const user_id = req.user.id;
  db.query(
    "SELECT * FROM project_listings WHERE user_id = ? ORDER BY created_at DESC",
    [user_id],
    (err, results) => {
      if (err) {
        console.error("❌ Error fetching user projects:", err);
        return res.status(500).json({ error: "Database error" });
      }
      res.json(results);
    }
  );
});

module.exports = router;
