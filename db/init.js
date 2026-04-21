const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'career_compass.db');

let _db = null;

function getDB() {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
  }
  return _db;
}

function initDB() {
  const db = getDB();

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      target_job TEXT DEFAULT '',
      university TEXT DEFAULT '',
      major TEXT DEFAULT '',
      grade TEXT DEFAULT '',
      bio TEXT DEFAULT '',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS skill_assessments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      job_id TEXT NOT NULL,
      job_title TEXT NOT NULL,
      scores TEXT NOT NULL,
      gap_summary TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS interview_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      job_id TEXT NOT NULL,
      job_title TEXT NOT NULL,
      question_index INTEGER NOT NULL,
      question_text TEXT NOT NULL,
      answer TEXT NOT NULL,
      feedback TEXT DEFAULT '',
      score INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS resumes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      situation TEXT NOT NULL,
      task TEXT NOT NULL,
      action TEXT NOT NULL,
      result TEXT NOT NULL,
      generated_texts TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS login_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      ip TEXT DEFAULT '',
      user_agent TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Indexes for query performance
    CREATE INDEX IF NOT EXISTS idx_skill_user ON skill_assessments(user_id);
    CREATE INDEX IF NOT EXISTS idx_skill_user_job ON skill_assessments(user_id, job_id);
    CREATE INDEX IF NOT EXISTS idx_interview_user ON interview_records(user_id);
    CREATE INDEX IF NOT EXISTS idx_interview_user_job ON interview_records(user_id, job_id);
    CREATE INDEX IF NOT EXISTS idx_resume_user ON resumes(user_id);
    CREATE INDEX IF NOT EXISTS idx_login_user ON login_logs(user_id);
  `);

  return db;
}

function safeJsonParse(str, fallback) {
  try {
    return JSON.parse(str);
  } catch (e) {
    return fallback !== undefined ? fallback : {};
  }
}

// Graceful shutdown
process.on('exit', () => {
  if (_db) { try { _db.close(); } catch (e) {} }
});

module.exports = { initDB, getDB, safeJsonParse };
