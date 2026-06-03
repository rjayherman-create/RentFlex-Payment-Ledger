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
const declaredViews = extractDeclaredViews(appSource);
const renderBranches = extractMatches(appSource, /view === "([^"]+)"/g);
const setViewTargets = extractMatches(appSource, /setView\("([^"]+)"\)/g);
const navTargets = extractMatches(appSource, /id: "([^"]+)"/g).filter((target) => declaredViews.includes(target));
const hrefTargets = extractMatches(appSource, /href=["']([^"']+)["']/g);

for (const view of expectedViews) {
  if (!declaredViews.includes(view)) failures.push(`Missing ViewId declaration: ${view}`);
  if (!renderBranches.includes(view)) failures.push(`Missing render branch: ${view}`);
}

for (const view of workflowNavViews) {
  if (!navTargets.includes(view)) failures.push(`Missing sidebar workflow target: ${view}`);
}

for (const view of setViewTargets) {
  if (!declaredViews.includes(view)) failures.push(`setView target is not declared in ViewId: ${view}`);
  if (!renderBranches.includes(view)) failures.push(`setView target has no render branch: ${view}`);
}

for (const view of navTargets) {
  if (!declaredViews.includes(view)) failures.push(`Sidebar target is not declared in ViewId: ${view}`);
  if (!renderBranches.includes(view)) failures.push(`Sidebar target has no render branch: ${view}`);
}

if (navTargets.includes("new_tenant")) {
  failures.push("New Tenant should not be a sidebar nav item.");
}

const expectedClickableLabels = [
  "New Tenant",
  "Record Payment",
  "Send Reminder",
  "Create Statement",
  "View all upcoming payments",
  "View all late payments"
];

for (const label of expectedClickableLabels) {
  if (!appSource.includes(label)) failures.push(`Missing clickable action label: ${label}`);
}

for (const href of hrefTargets) {
  if (!href || href === "#") failures.push(`Invalid href target: ${href || "(empty)"}`);
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
  sidebarWorkflowItems: workflowNavViews.length,
  setViewTargets: unique(setViewTargets).length,
  hrefTargets: unique(hrefTargets).length
}, null, 2));

function extractDeclaredViews(source) {
  const match = source.match(/type ViewId = ([^;]+);/);
  if (!match) return [];
  return extractMatches(match[1], /"([^"]+)"/g);
}

function extractMatches(source, pattern) {
  return [...source.matchAll(pattern)].map((match) => match[1]);
}

function unique(values) {
  return Array.from(new Set(values));
}

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
