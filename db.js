const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const path = require("path");

const DB_PATH = path.join(__dirname, "scores.db");

async function init() {
  const db = await open({
    filename: DB_PATH,
    driver: sqlite3.Database
  });
  await db.exec(`
    CREATE TABLE IF NOT EXISTS scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      score INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  return db;
}

async function addScore(name, score) {
  const db = await init();
  const result = await db.run(
    "INSERT INTO scores (name, score) VALUES (?, ?)",
    name,
    score
  );
  await db.close();
  return result.lastID;
}

async function getTopScores(limit = 10) {
  const db = await init();
  const rows = await db.all(
    "SELECT id, name, score, created_at FROM scores ORDER BY score DESC, created_at ASC LIMIT ?",
    limit
  );
  await db.close();
  return rows;
}

module.exports = {
  addScore,
  getTopScores
};