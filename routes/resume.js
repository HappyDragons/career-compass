const express = require('express');
const { getDB } = require('../db/init');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// POST /api/resume - Save generated resume
router.post('/', authMiddleware, (req, res) => {
  const { type, situation, task, action, result, generated_texts } = req.body;
  if (!situation || !task || !action || !result) {
    return res.status(400).json({ error: '请填写完整STAR四个字段' });
  }
  const db = getDB();
  try {
    const r = db.prepare(`
      INSERT INTO resumes (user_id, type, situation, task, action, result, generated_texts)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(req.user.id, type || 'general', situation, task, action, result, JSON.stringify(generated_texts || []));
    res.json({ message: '简历已保存', id: r.lastInsertRowid });
  } finally {
    db.close();
  }
});

// GET /api/resume - Get all saved resumes
router.get('/', authMiddleware, (req, res) => {
  const db = getDB();
  try {
    const records = db.prepare(`
      SELECT * FROM resumes WHERE user_id = ? ORDER BY created_at DESC
    `).all(req.user.id);
    records.forEach(r => { r.generated_texts = JSON.parse(r.generated_texts); });
    res.json({ records });
  } finally {
    db.close();
  }
});

// DELETE /api/resume/:id
router.delete('/:id', authMiddleware, (req, res) => {
  const db = getDB();
  try {
    db.prepare('DELETE FROM resumes WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    res.json({ message: '已删除' });
  } finally {
    db.close();
  }
});

module.exports = router;
