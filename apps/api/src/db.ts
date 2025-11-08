/**
 * SQLite database client and schema
 */

import Database from "better-sqlite3";
import path from "path";

const DB_PATH = process.env.DATABASE_URL?.replace("file:", "") || "./OptiX.sqlite";

export const db = new Database(DB_PATH);

// Enable WAL mode for better concurrency
db.pragma("journal_mode = WAL");

/**
 * Initialize database schema
 */
function initDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      createdAt TEXT NOT NULL,
      deviceInfo TEXT,
      distanceCm REAL,
      screenPpi REAL,
      lighting TEXT,
      state TEXT NOT NULL DEFAULT 'active'
    );

    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sessionId TEXT NOT NULL,
      t INTEGER NOT NULL,
      step TEXT NOT NULL,
      lettersShown TEXT,
      speechText TEXT,
      correct INTEGER,
      latencyMs INTEGER,
      params TEXT,
      FOREIGN KEY (sessionId) REFERENCES sessions(id)
    );

    CREATE TABLE IF NOT EXISTS rx (
      sessionId TEXT NOT NULL,
      eye TEXT NOT NULL,
      S REAL NOT NULL,
      C REAL NOT NULL,
      Axis REAL NOT NULL,
      VA_logMAR REAL,
      confidence REAL,
      PRIMARY KEY (sessionId, eye),
      FOREIGN KEY (sessionId) REFERENCES sessions(id)
    );

    CREATE INDEX IF NOT EXISTS idx_events_session ON events(sessionId);
    CREATE INDEX IF NOT EXISTS idx_events_step ON events(step);
  `);

  console.log("✅ Database initialized at", DB_PATH);
}

// Initialize database immediately
initDB();

/**
 * Session queries
 */
export const sessionQueries = {
  create: db.prepare(`
    INSERT INTO sessions (id, createdAt, deviceInfo, distanceCm, screenPpi, lighting, state)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `),

  getById: db.prepare("SELECT * FROM sessions WHERE id = ?"),

  updateState: db.prepare("UPDATE sessions SET state = ? WHERE id = ?"),

  getAll: db.prepare("SELECT * FROM sessions ORDER BY createdAt DESC LIMIT 100"),
};

/**
 * Event queries
 */
export const eventQueries = {
  create: db.prepare(`
    INSERT INTO events (sessionId, t, step, lettersShown, speechText, correct, latencyMs, params)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `),

  getBySession: db.prepare(
    "SELECT * FROM events WHERE sessionId = ? ORDER BY t ASC"
  ),

  getRecent: db.prepare(
    "SELECT * FROM events WHERE sessionId = ? ORDER BY t DESC LIMIT ?"
  ),
};

/**
 * Rx queries
 */
export const rxQueries = {
  upsert: db.prepare(`
    INSERT INTO rx (sessionId, eye, S, C, Axis, VA_logMAR, confidence)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(sessionId, eye) DO UPDATE SET
      S = excluded.S,
      C = excluded.C,
      Axis = excluded.Axis,
      VA_logMAR = excluded.VA_logMAR,
      confidence = excluded.confidence
  `),

  getBySession: db.prepare("SELECT * FROM rx WHERE sessionId = ?"),

  getBySessionAndEye: db.prepare("SELECT * FROM rx WHERE sessionId = ? AND eye = ?"),
};

/**
 * Helper to serialize params
 */
export function serializeParams(params: any): string {
  return JSON.stringify(params);
}

/**
 * Helper to parse params
 */
export function parseParams(params: string | null): any {
  if (!params) return {};
  try {
    return JSON.parse(params);
  } catch {
    return {};
  }
}

