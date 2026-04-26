const Database = require("better-sqlite3");
const path = require("path");

const db = new Database(path.join(__dirname, "healthcare.db"));

function initDB() {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS vital_history (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id  TEXT NOT NULL,
        heart_rate  INTEGER NOT NULL,
        temperature REAL NOT NULL,
        spo2        INTEGER NOT NULL,
        timestamp   INTEGER NOT NULL,
        created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("[DB] ✅ SQLite terhubung & tabel siap (file: healthcare.db)");
    return true;
  } catch (err) {
    console.error("[DB] ❌ Gagal init SQLite:", err.message);
    return false;
  }
}

async function insertVital(v) {
  try {
    db.prepare(
      "INSERT INTO vital_history (patient_id, heart_rate, temperature, spo2, timestamp) VALUES (?, ?, ?, ?, ?)"
    ).run(v.patient_id, v.heart_rate, v.temperature, v.spo2, v.timestamp);
  } catch (err) {
    console.error("[DB] insert error:", err.message);
  }
}

module.exports = { initDB, insertVital };