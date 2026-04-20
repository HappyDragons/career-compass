const express = require('express');
const { getDB } = require('../db/init');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /api/profile
router.get('/', authMiddleware, (req, res) => {
  const db = getDB();
  try {
    const profile = db.prepare(`
      SELECT p.*, u.username, u.email, u.created_at as registered_at
      FROM profiles p JOIN users u ON p.user_id = u.id
      WHERE p.user_id = ?
    `).get(req.user.id);
    res.json({ profile: profile || {} });
  } finally {
    db.close();
  }
});

// PUT /api/profile
router.put('/', authMiddleware, (req, res) => {
  const { target_job, university, major, grade, bio } = req.body;
  const db = getDB();
  try {
    db.prepare(`
      UPDATE profiles SET target_job = ?, university = ?, major = ?, grade = ?, bio = ?, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `).run(target_job || '', university || '', major || '', grade || '', bio || '', req.user.id);
    res.json({ message: '个人档案已更新' });
  } finally {
    db.close();
  }
});

module.exports = router;
