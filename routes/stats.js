const express = require('express');
const { getDB, safeJsonParse } = require('../db/init');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /api/stats - Dashboard statistics for current user
router.get('/', authMiddleware, (req, res) => {
  try {
    const db = getDB();
    const userId = req.user.id;

    const skillCount = db.prepare('SELECT COUNT(*) as count FROM skill_assessments WHERE user_id = ?').get(userId).count;
    const interviewCount = db.prepare('SELECT COUNT(*) as count FROM interview_records WHERE user_id = ?').get(userId).count;
    const resumeCount = db.prepare('SELECT COUNT(*) as count FROM resumes WHERE user_id = ?').get(userId).count;
    const jobsExplored = db.prepare('SELECT COUNT(DISTINCT job_id) as count FROM skill_assessments WHERE user_id = ?').get(userId).count;

    const interviewScores = db.prepare(`
      SELECT score, job_title, question_text, created_at
      FROM interview_records WHERE user_id = ? AND score > 0
      ORDER BY created_at DESC LIMIT 10
    `).all(userId);

    const skillHistory = db.prepare(`
      SELECT sa.* FROM skill_assessments sa
      INNER JOIN (
        SELECT job_id, MAX(created_at) as max_date
        FROM skill_assessments WHERE user_id = ?
        GROUP BY job_id
      ) latest ON sa.job_id = latest.job_id AND sa.created_at = latest.max_date
      WHERE sa.user_id = ?
      ORDER BY sa.created_at DESC
    `).all(userId, userId);
    skillHistory.forEach(r => { r.scores = safeJsonParse(r.scores, {}); });

    const recentActivity = db.prepare(`
      SELECT '技能评估' as type, job_title as title, created_at FROM skill_assessments WHERE user_id = ?
      UNION ALL
      SELECT '模拟面试' as type, job_title || ': ' || SUBSTR(question_text, 1, 20) || '...' as title, created_at FROM interview_records WHERE user_id = ?
      UNION ALL
      SELECT '简历生成' as type, type || '类型' as title, created_at FROM resumes WHERE user_id = ?
      ORDER BY created_at DESC LIMIT 10
    `).all(userId, userId, userId);

    const loginCount = db.prepare('SELECT COUNT(*) as count FROM login_logs WHERE user_id = ?').get(userId).count;

    const user = db.prepare('SELECT created_at FROM users WHERE id = ?').get(userId);
    const daysSinceReg = user ? Math.floor((Date.now() - new Date(user.created_at + 'Z').getTime()) / 86400000) : 0;

    res.json({
      overview: { skillCount, interviewCount, resumeCount, jobsExplored, loginCount, daysSinceReg },
      interviewScores,
      skillHistory,
      recentActivity
    });
  } catch (err) {
    console.error('Stats error:', err.message);
    res.status(500).json({ error: '获取统计数据失败' });
  }
});

module.exports = router;
