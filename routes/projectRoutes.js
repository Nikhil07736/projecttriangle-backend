// backend/routes/projectRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const db = require('../config/db');
// ✨ Import the protect middleware
const { protect } = require('../middleware/authMiddleware');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });

// 📌 MODIFIED: POST route to submit a new project
// ✨ Add the 'protect' middleware here
router.post('/submit-project', protect, upload.single('file'), (req, res) => {
  const { title, description, category, budget, deadline, skills } = req.body;
  const file_path = req.file ? `/uploads/${req.file.filename}` : null;
  // ✨ Get the user's ID from the authenticated request
  const user_id = req.user.id;

  const sql = `
    INSERT INTO projects 
    (title, skills, description, deadline, category, budget, file_path, user_id) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  // ✨ Add user_id to the values that are saved in the database
  const values = [title, skills, description, deadline, category, budget, file_path, user_id];

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error('❌ Error inserting project:', err);
      return res.status(500).json({ error: 'Failed to submit project' });
    }
    return res.status(200).json({ message: '✅ Project submitted successfully!' });
  });
});

// GET route to fetch all projects (no changes needed here)
router.get('/', (req, res) => {
  const sql = 'SELECT * FROM projects ORDER BY id DESC';
  db.query(sql, (err, results) => {
    if (err) {
      console.error('❌ Error fetching projects:', err);
      return res.status(500).json({ error: 'Failed to fetch projects' });
    }
    const projects = results.map(p => ({
      ...p,
      fileUrl: p.file_path
    }));
    return res.status(200).json(projects);
  });
});

router.get('/test', (req, res) => {
  res.send('✅ Project routes working');
});

module.exports = router;