import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvFiles } from "../server/env.mjs";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
loadEnvFiles(rootDir);

const webPort = process.env.RENTFLEX_WEB_PORT ?? process.env.VITE_PORT ?? "5184";
const apiPort = process.env.RENTFLEX_API_PORT ?? process.env.PORT ?? "5185";
const apiBaseUrl = process.env.VITE_API_PROXY_TARGET ?? `http://127.0.0.1:${apiPort}`;
const appSource = readFileSync(join(rootDir, "src", "App.tsx"), "utf8");

const expectedViews = [
  "dashboard",
  "rent_due",
  "properties",
  "tenants",
  "payment_plans",
  "new_tenant",
  "documents",
  "ledger",
  "reminders",
  "late",
  "reports",
  "settings"
];

const workflowNavViews = [
  "dashboard",
  "rent_due",
  "reminders",
  "late",
  "tenants",
  "payment_plans",
  "properties",
  "ledger",
  "documents",
  "reports",
  "settings"
];

const failures = [];

for (const view of expectedViews) {
  if (!appSource.includes(`"${view}"`)) failures.push(`Missing ViewId reference: ${view}`);
  if (!appSource.includes(`view === "${view}"`)) failures.push(`Missing render branch: ${view}`);
}

for (const view of workflowNavViews) {
  if (!appSource.includes(`id: "${view}"`)) failures.push(`Missing sidebar workflow target: ${view}`);
}

if (appSource.includes(`id: "new_tenant"`)) {
  failures.push("New Tenant should not be a sidebar nav item.");
}

await checkJson(`${apiBaseUrl}/api/health`, "GET /api/health", (body) => body.ok === true);
await checkJson(`${apiBaseUrl}/api/state`, "GET /api/state", (body) =>
  Array.isArray(body.properties) &&
  Array.isArray(body.tenants) &&
  Array.isArray(body.payments) &&
  Array.isArray(body.promises) &&
  Array.isArray(body.reminders) &&
  Array.isArray(body.documents)
);

await checkText(`http://localhost:${webPort}/`, "GET frontend", (body) => body.includes("id=\"root\""));

if (failures.length > 0) {
  console.error("Route and variable verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  frontend: `http://localhost:${webPort}`,
  api: apiBaseUrl,
  views: expectedViews.length,
  sidebarWorkflowItems: workflowNavViews.length
}, null, 2));

async function checkJson(url, label, validate) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      failures.push(`${label} returned ${response.status}`);
      return;
    }
    const body = await response.json();
    if (!validate(body)) failures.push(`${label} returned unexpected JSON`);
  } catch (error) {
    failures.push(`${label} failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

async function checkText(url, label, validate) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      failures.push(`${label} returned ${response.status}`);
      return;
    }
    const body = await response.text();
    if (!validate(body)) failures.push(`${label} returned unexpected HTML`);
  } catch (error) {
    failures.push(`${label} failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
