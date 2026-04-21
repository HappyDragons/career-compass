const express = require('express');
const { getDB } = require('../db/init');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// POST /api/interview - Save an interview answer
router.post('/', authMiddleware, (req, res) => {
  const { job_id, job_title, question_index, question_text, answer, feedback, score } = req.body;
  if (!job_id || !answer || question_index === undefined) {
    return res.status(400).json({ error: '缺少必要参数' });
  }
  if (answer.length > 5000) {
    return res.status(400).json({ error: '回答内容过长' });
  }
  try {
    const db = getDB();
    const result = db.prepare(`
      INSERT INTO interview_records (user_id, job_id, job_title, question_index, question_text, answer, feedback, score)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(req.user.id, job_id, job_title || '', question_index, question_text || '', answer, feedback || '', score || 0);
    res.json({ message: '面试记录已保存', id: result.lastInsertRowid });
  } catch (err) {
    console.error('Interview save error:', err.message);
    res.status(500).json({ error: '保存失败' });
  }
});

// GET /api/interview - Get all interview records
router.get('/', authMiddleware, (req, res) => {
  try {
    const db = getDB();
    const records = db.prepare(`
      SELECT * FROM interview_records WHERE user_id = ? ORDER BY created_at DESC LIMIT 100
    `).all(req.user.id);
    res.json({ records });
  } catch (err) {
    console.error('Interview list error:', err.message);
    res.status(500).json({ error: '获取记录失败' });
  }
});

// GET /api/interview/job/:jobId
router.get('/job/:jobId', authMiddleware, (req, res) => {
  try {
    const db = getDB();
    const records = db.prepare(`
      SELECT * FROM interview_records WHERE user_id = ? AND job_id = ? ORDER BY created_at DESC LIMIT 50
    `).all(req.user.id, req.params.jobId);
    res.json({ records });
  } catch (err) {
    console.error('Interview by job error:', err.message);
    res.status(500).json({ error: '获取记录失败' });
  }
});

// DELETE /api/interview/:id
router.delete('/:id', authMiddleware, (req, res) => {
  try {
    const db = getDB();
    db.prepare('DELETE FROM interview_records WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    res.json({ message: '已删除' });
  } catch (err) {
    console.error('Interview delete error:', err.message);
    res.status(500).json({ error: '删除失败' });
  }
});

module.exports = router;
