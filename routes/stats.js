const express = require('express');
const { getDB } = require('../db/init');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /api/stats - Dashboard statistics for current user
router.get('/', authMiddleware, (req, res) => {
  const db = getDB();
  try {
    const userId = req.user.id;

    // Total skill assessments
    const skillCount = db.prepare('SELECT COUNT(*) as count FROM skill_assessments WHERE user_id = ?').get(userId).count;

    // Total interview practice answers
    const interviewCount = db.prepare('SELECT COUNT(*) as count FROM interview_records WHERE user_id = ?').get(userId).count;

    // Total resumes generated
    const resumeCount = db.prepare('SELECT COUNT(*) as count FROM resumes WHERE user_id = ?').get(userId).count;

    // Unique jobs assessed
    const jobsExplored = db.prepare('SELECT COUNT(DISTINCT job_id) as count FROM skill_assessments WHERE user_id = ?').get(userId).count;

    // Interview score trend (last 10)
    const interviewScores = db.prepare(`
      SELECT score, job_title, question_text, created_at
      FROM interview_records WHERE user_id = ? AND score > 0
      ORDER BY created_at DESC LIMIT 10
    `).all(userId);

    // Skill assessment history (latest per job)
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
    skillHistory.forEach(r => { r.scores = JSON.parse(r.scores); });

    // Recent activity (last 10 actions across all tables)
    const recentActivity = db.prepare(`
      SELECT '技能评估' as type, job_title as title, created_at FROM skill_assessments WHERE user_id = ?
      UNION ALL
      SELECT '模拟面试' as type, job_title || ': ' || SUBSTR(question_text, 1, 20) || '...' as title, created_at FROM interview_records WHERE user_id = ?
      UNION ALL
      SELECT '简历生成' as type, type || '类型' as title, created_at FROM resumes WHERE user_id = ?
      ORDER BY created_at DESC LIMIT 10
    `).all(userId, userId, userId);

    // Login count
    const loginCount = db.prepare('SELECT COUNT(*) as count FROM login_logs WHERE user_id = ?').get(userId).count;

    // Days since registration
    const user = db.prepare('SELECT created_at FROM users WHERE id = ?').get(userId);
    const daysSinceReg = user ? Math.floor((Date.now() - new Date(user.created_at + 'Z').getTime()) / 86400000) : 0;

    res.json({
      overview: {
        skillCount,
        interviewCount,
        resumeCount,
        jobsExplored,
        loginCount,
        daysSinceReg
      },
      interviewScores,
      skillHistory,
      recentActivity
    });
  } finally {
    db.close();
  }
});

module.exports = router;
