import { mkdirSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { loadEnvFiles } from "./env.mjs";
import { documentsSeed, paymentsSeed, propertiesSeed, promisesSeed, tenantsSeed } from "./seed.mjs";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
loadEnvFiles(rootDir);

const dataDir = join(rootDir, "data");
mkdirSync(dataDir, { recursive: true });

const dbPath = process.env.RENTFLEX_DB_PATH
  ? isAbsolute(process.env.RENTFLEX_DB_PATH) ? process.env.RENTFLEX_DB_PATH : join(rootDir, process.env.RENTFLEX_DB_PATH)
  : join(dataDir, "rentflex.sqlite");

export const db = new DatabaseSync(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS app_records (
    collection TEXT NOT NULL,
    id TEXT NOT NULL,
    data TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (collection, id)
  );
`);

const count = db.prepare("SELECT COUNT(*) AS count FROM app_records").get().count;
if (count === 0) {
  seedCollection("properties", propertiesSeed);
  seedCollection("tenants", tenantsSeed);
  seedCollection("payments", paymentsSeed);
  seedCollection("promises", promisesSeed);
  seedCollection("reminders", []);
  seedCollection("documents", documentsSeed);
}

export function getState() {
  return {
    properties: getCollection("properties"),
    tenants: getCollection("tenants"),
    payments: getCollection("payments"),
    promises: getCollection("promises"),
    reminders: getCollection("reminders"),
    documents: getCollection("documents")
  };
}

export function upsertRecord(collection, record) {
  db.prepare(`
    INSERT INTO app_records (collection, id, data, updated_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(collection, id) DO UPDATE SET
      data = excluded.data,
      updated_at = CURRENT_TIMESTAMP
  `).run(collection, record.id, JSON.stringify(record));
  return record;
}

export function patchRecord(collection, id, patch) {
  const current = getRecord(collection, id);
  if (!current) return undefined;
  const next = { ...current, ...patch };
  upsertRecord(collection, next);
  return next;
}

function getRecord(collection, id) {
  const row = db.prepare("SELECT data FROM app_records WHERE collection = ? AND id = ?").get(collection, id);
  return row ? JSON.parse(row.data) : undefined;
}

function getCollection(collection) {
  return db.prepare("SELECT data FROM app_records WHERE collection = ? ORDER BY updated_at, id")
    .all(collection)
    .map((row) => JSON.parse(row.data));
}

function seedCollection(collection, records) {
  for (const record of records) {
    upsertRecord(collection, record);
  }
}
