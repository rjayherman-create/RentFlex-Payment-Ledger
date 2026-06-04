import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { loadEnvFiles, parseBoolean } from "./env.mjs";
import { documentsSeed, paymentsSeed, propertiesSeed, promisesSeed, tenantsSeed } from "./seed.mjs";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
loadEnvFiles(rootDir);

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required. Set a Postgres connection string in your environment.");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "false" ? false : process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
});

const initPromise = initialize();

export async function getState() {
  await initPromise;
  return {
    activityLogs: await getCollection("activity_logs"),
    auditEvents: await getCollection("audit_events"),
    communicationReceipts: await getCollection("communication_receipts"),
    properties: await getCollection("properties"),
    tenants: await getCollection("tenants"),
    payments: await getCollection("payments"),
    promises: await getCollection("promises"),
    reminders: await getCollection("reminders"),
    documents: await getCollection("documents"),
    planAcceptances: await getCollection("plan_acceptances"),
    generatedPlanPdfs: await getCollection("generated_plan_pdfs")
  };
}

export async function upsertRecord(collection, record) {
  await initPromise;
  await pool.query(`
    INSERT INTO app_records (collection, id, data, updated_at)
    VALUES ($1, $2, $3::jsonb, CURRENT_TIMESTAMP)
    ON CONFLICT(collection, id) DO UPDATE SET
      data = excluded.data,
      updated_at = CURRENT_TIMESTAMP
  `, [collection, record.id, JSON.stringify(record)]);
  return record;
}

export async function patchRecord(collection, id, patch) {
  await initPromise;
  const current = await getRecord(collection, id);
  if (!current) return undefined;
  const next = { ...current, ...patch };
  await upsertRecord(collection, next);
  return next;
}

export async function getDatabaseHealth() {
  try {
    await initPromise;
    await pool.query("SELECT 1");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Database connection failed" };
  }
}

async function getRecord(collection, id) {
  const result = await pool.query(
    "SELECT data FROM app_records WHERE collection = $1 AND id = $2",
    [collection, id]
  );
  return result.rows[0]?.data;
}

async function getCollection(collection) {
  const result = await pool.query(
    "SELECT data FROM app_records WHERE collection = $1 ORDER BY updated_at, id",
    [collection]
  );
  return result.rows.map((row) => row.data);
}

async function seedCollection(collection, records) {
  for (const record of records) {
    await upsertRecord(collection, record);
  }
}

async function initialize() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_records (
      collection TEXT NOT NULL,
      id TEXT NOT NULL,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (collection, id)
    );
  `);

  const countResult = await pool.query("SELECT COUNT(*)::int AS count FROM app_records");
  const shouldSeedDemo = parseBoolean(process.env.ALLOW_DEMO_SEED, process.env.NODE_ENV !== "production");
  if (countResult.rows[0].count === 0 && shouldSeedDemo) {
    await seedCollection("properties", propertiesSeed);
    await seedCollection("tenants", tenantsSeed);
    await seedCollection("payments", paymentsSeed);
    await seedCollection("promises", promisesSeed);
    await seedCollection("reminders", []);
    await seedCollection("documents", documentsSeed);
    await seedCollection("plan_acceptances", []);
    await seedCollection("activity_logs", []);
    await seedCollection("audit_events", []);
    await seedCollection("communication_receipts", []);
    await seedCollection("generated_plan_pdfs", []);
  }
}
