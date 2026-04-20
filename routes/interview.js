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
  const db = getDB();
  try {
    const result = db.prepare(`
      INSERT INTO interview_records (user_id, job_id, job_title, question_index, question_text, answer, feedback, score)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(req.user.id, job_id, job_title || '', question_index, question_text || '', answer, feedback || '', score || 0);
    res.json({ message: '面试记录已保存', id: result.lastInsertRowid });
  } finally {
    db.close();
  }
});

// GET /api/interview - Get all interview records
router.get('/', authMiddleware, (req, res) => {
  const db = getDB();
  try {
    const records = db.prepare(`
      SELECT * FROM interview_records WHERE user_id = ? ORDER BY created_at DESC
    `).all(req.user.id);
    res.json({ records });
  } finally {
    db.close();
  }
});

// GET /api/interview/job/:jobId
router.get('/job/:jobId', authMiddleware, (req, res) => {
  const db = getDB();
  try {
    const records = db.prepare(`
      SELECT * FROM interview_records WHERE user_id = ? AND job_id = ? ORDER BY created_at DESC
    `).all(req.user.id, req.params.jobId);
    res.json({ records });
  } finally {
    db.close();
  }
});

module.exports = router;
