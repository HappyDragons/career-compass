const express = require('express');
const { getDB } = require('../db/init');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// POST /api/skill - Save a skill assessment
router.post('/', authMiddleware, (req, res) => {
  const { job_id, job_title, scores, gap_summary } = req.body;
  if (!job_id || !job_title || !scores) {
    return res.status(400).json({ error: '缺少必要参数' });
  }
  const db = getDB();
  try {
    const result = db.prepare(`
      INSERT INTO skill_assessments (user_id, job_id, job_title, scores, gap_summary)
      VALUES (?, ?, ?, ?, ?)
    `).run(req.user.id, job_id, job_title, JSON.stringify(scores), gap_summary || '');
    res.json({ message: '技能评估已保存', id: result.lastInsertRowid });
  } finally {
    db.close();
  }
});

// GET /api/skill - Get all assessments for current user
router.get('/', authMiddleware, (req, res) => {
  const db = getDB();
  try {
    const records = db.prepare(`
      SELECT * FROM skill_assessments WHERE user_id = ? ORDER BY created_at DESC
    `).all(req.user.id);
    records.forEach(r => { r.scores = JSON.parse(r.scores); });
    res.json({ records });
  } finally {
    db.close();
  }
});

// GET /api/skill/latest/:jobId
router.get('/latest/:jobId', authMiddleware, (req, res) => {
  const db = getDB();
  try {
    const record = db.prepare(`
      SELECT * FROM skill_assessments WHERE user_id = ? AND job_id = ? ORDER BY created_at DESC LIMIT 1
    `).get(req.user.id, req.params.jobId);
    if (record) record.scores = JSON.parse(record.scores);
    res.json({ record: record || null });
  } finally {
    db.close();
  }
});

// DELETE /api/skill/:id
router.delete('/:id', authMiddleware, (req, res) => {
  const db = getDB();
  try {
    db.prepare('DELETE FROM skill_assessments WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    res.json({ message: '已删除' });
  } finally {
    db.close();
  }
});

module.exports = router;
