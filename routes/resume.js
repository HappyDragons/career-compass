const express = require('express');
const { getDB, safeJsonParse } = require('../db/init');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// POST /api/resume - Save generated resume
router.post('/', authMiddleware, (req, res) => {
  const { type, situation, task, action, result, generated_texts } = req.body;
  if (!situation || !task || !action || !result) {
    return res.status(400).json({ error: '请填写完整STAR四个字段' });
  }
  if (situation.length > 500 || task.length > 500 || action.length > 500 || result.length > 500) {
    return res.status(400).json({ error: '每个字段最多500字' });
  }
  try {
    const db = getDB();
    const r = db.prepare(`
      INSERT INTO resumes (user_id, type, situation, task, action, result, generated_texts)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(req.user.id, type || 'general', situation, task, action, result, JSON.stringify(generated_texts || []));
    res.json({ message: '简历已保存', id: r.lastInsertRowid });
  } catch (err) {
    console.error('Resume save error:', err.message);
    res.status(500).json({ error: '保存失败' });
  }
});

// GET /api/resume - Get all saved resumes
router.get('/', authMiddleware, (req, res) => {
  try {
    const db = getDB();
    const records = db.prepare(`
      SELECT * FROM resumes WHERE user_id = ? ORDER BY created_at DESC LIMIT 100
    `).all(req.user.id);
    records.forEach(r => { r.generated_texts = safeJsonParse(r.generated_texts, []); });
    res.json({ records });
  } catch (err) {
    console.error('Resume list error:', err.message);
    res.status(500).json({ error: '获取记录失败' });
  }
});

// DELETE /api/resume/:id
router.delete('/:id', authMiddleware, (req, res) => {
  try {
    const db = getDB();
    db.prepare('DELETE FROM resumes WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    res.json({ message: '已删除' });
  } catch (err) {
    console.error('Resume delete error:', err.message);
    res.status(500).json({ error: '删除失败' });
  }
});

module.exports = router;
