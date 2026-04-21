const express = require('express');
const { getDB } = require('../db/init');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /api/profile
router.get('/', authMiddleware, (req, res) => {
  try {
    const db = getDB();
    const profile = db.prepare(`
      SELECT p.*, u.username, u.email, u.created_at as registered_at
      FROM profiles p JOIN users u ON p.user_id = u.id
      WHERE p.user_id = ?
    `).get(req.user.id);
    res.json({ profile: profile || {} });
  } catch (err) {
    console.error('Profile get error:', err.message);
    res.status(500).json({ error: '获取档案失败' });
  }
});

// PUT /api/profile
router.put('/', authMiddleware, (req, res) => {
  const { target_job, university, major, grade, bio } = req.body;

  // Input length validation
  if (university && university.length > 50) return res.status(400).json({ error: '学校名称过长' });
  if (major && major.length > 50) return res.status(400).json({ error: '专业名称过长' });
  if (bio && bio.length > 500) return res.status(400).json({ error: '个人简介最多500字' });

  try {
    const db = getDB();
    db.prepare(`
      UPDATE profiles SET target_job = ?, university = ?, major = ?, grade = ?, bio = ?, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `).run(target_job || '', university || '', major || '', grade || '', bio || '', req.user.id);
    res.json({ message: '个人档案已更新' });
  } catch (err) {
    console.error('Profile update error:', err.message);
    res.status(500).json({ error: '更新档案失败' });
  }
});

module.exports = router;
