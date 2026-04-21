const express = require('express');
const { getDB, safeJsonParse } = require('../db/init');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// POST /api/skill - Save a skill assessment
router.post('/', authMiddleware, (req, res) => {
  const { job_id, job_title, scores, gap_summary } = req.body;
  if (!job_id || !job_title || !scores || typeof scores !== 'object') {
    return res.status(400).json({ error: '缺少必要参数' });
  }
  try {
    const db = getDB();
    const result = db.prepare(`
      INSERT INTO skill_assessments (user_id, job_id, job_title, scores, gap_summary)
      VALUES (?, ?, ?, ?, ?)
    `).run(req.user.id, job_id, job_title, JSON.stringify(scores), gap_summary || '');
    res.json({ message: '技能评估已保存', id: result.lastInsertRowid });
  } catch (err) {
    console.error('Skill save error:', err.message);
    res.status(500).json({ error: '保存失败' });
  }
});

// GET /api/skill - Get all assessments for current user
router.get('/', authMiddleware, (req, res) => {
  try {
    const db = getDB();
    const records = db.prepare(`
      SELECT * FROM skill_assessments WHERE user_id = ? ORDER BY created_at DESC LIMIT 100
    `).all(req.user.id);
    records.forEach(r => { r.scores = safeJsonParse(r.scores, {}); });
    res.json({ records });
  } catch (err) {
    console.error('Skill list error:', err.message);
    res.status(500).json({ error: '获取记录失败' });
  }
});

// GET /api/skill/latest/:jobId
router.get('/latest/:jobId', authMiddleware, (req, res) => {
  try {
    const db = getDB();
    const record = db.prepare(`
      SELECT * FROM skill_assessments WHERE user_id = ? AND job_id = ? ORDER BY created_at DESC LIMIT 1
    `).get(req.user.id, req.params.jobId);
    if (record) record.scores = safeJsonParse(record.scores, {});
    res.json({ record: record || null });
  } catch (err) {
    console.error('Skill latest error:', err.message);
    res.status(500).json({ error: '获取记录失败' });
  }
});

// DELETE /api/skill/:id
router.delete('/:id', authMiddleware, (req, res) => {
  try {
    const db = getDB();
    db.prepare('DELETE FROM skill_assessments WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    res.json({ message: '已删除' });
  } catch (err) {
    console.error('Skill delete error:', err.message);
    res.status(500).json({ error: '删除失败' });
  }
});

module.exports = router;
