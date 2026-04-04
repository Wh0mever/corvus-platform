import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(__dirname, '..', 'corvus.db');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema();
  }
  return db;
}

function initSchema(): void {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS companies (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      name            TEXT    NOT NULL,
      type            TEXT    NOT NULL DEFAULT 'supplier',
      region          TEXT    NOT NULL DEFAULT '',
      inn             TEXT    NOT NULL DEFAULT '',
      address         TEXT    NOT NULL DEFAULT '',
      registered_date TEXT    NOT NULL DEFAULT '',
      director_id     INTEGER,
      wins_count      INTEGER NOT NULL DEFAULT 0,
      total_value     REAL    NOT NULL DEFAULT 0,
      risk_score      INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS people (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT    NOT NULL,
      role       TEXT    NOT NULL DEFAULT '',
      risk_score INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS contracts (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      title            TEXT    NOT NULL,
      supplier_id      INTEGER NOT NULL REFERENCES companies(id),
      amount           REAL    NOT NULL,
      market_avg_price REAL    NOT NULL DEFAULT 0,
      category         TEXT    NOT NULL DEFAULT '',
      region           TEXT    NOT NULL DEFAULT '',
      date             TEXT    NOT NULL,
      bidder_count     INTEGER NOT NULL DEFAULT 1,
      risk_score       INTEGER NOT NULL DEFAULT 0,
      risk_flags       TEXT    NOT NULL DEFAULT '[]',
      status           TEXT    NOT NULL DEFAULT 'active',
      description      TEXT    NOT NULL DEFAULT '',
      created_at       TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS relationships (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      from_type    TEXT    NOT NULL,
      from_id      INTEGER NOT NULL,
      to_type      TEXT    NOT NULL,
      to_id        INTEGER NOT NULL,
      rel_type     TEXT    NOT NULL,
      strength     INTEGER NOT NULL DEFAULT 5,
      is_suspicious INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS anomalies (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      contract_id INTEGER NOT NULL REFERENCES contracts(id),
      type        TEXT    NOT NULL,
      title       TEXT    NOT NULL,
      description TEXT    NOT NULL,
      severity    TEXT    NOT NULL DEFAULT 'medium',
      evidence    TEXT    NOT NULL DEFAULT '{}',
      detected_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      type        TEXT    NOT NULL,
      title       TEXT    NOT NULL,
      message     TEXT    NOT NULL,
      severity    TEXT    NOT NULL DEFAULT 'medium',
      entity_type TEXT    NOT NULL DEFAULT 'contract',
      entity_id   INTEGER NOT NULL DEFAULT 0,
      contract_id INTEGER,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
      is_read     INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_contracts_supplier ON contracts(supplier_id);
    CREATE INDEX IF NOT EXISTS idx_contracts_risk     ON contracts(risk_score DESC);
    CREATE INDEX IF NOT EXISTS idx_anomalies_contract ON anomalies(contract_id);
    CREATE INDEX IF NOT EXISTS idx_alerts_severity    ON alerts(severity);
    CREATE INDEX IF NOT EXISTS idx_rels_from          ON relationships(from_type, from_id);
    CREATE INDEX IF NOT EXISTS idx_rels_to            ON relationships(to_type, to_id);
  `);
}

export function isEmpty(): boolean {
  const db = getDb();
  const row = db.prepare('SELECT COUNT(*) as cnt FROM companies').get() as { cnt: number };
  return row.cnt === 0;
}
