import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { getState, patchRecord, upsertRecord } from "./db.mjs";
import { loadEnvFiles } from "./env.mjs";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
loadEnvFiles(rootDir);

const port = Number(process.env.RENTFLEX_API_PORT ?? process.env.PORT ?? 5185);

const server = createServer(async (req, res) => {
  try {
    if (req.url === "/env.js") {
      sendEnvScript(res);
      return;
    }
    if (req.url?.startsWith("/api/")) {
      await handleApi(req, res);
      return;
    }
    await serveStatic(req, res);
  } catch (error) {
    sendJson(res, 500, { error: error instanceof Error ? error.message : "Unknown error" });
  }
});

server.listen(port, () => {
  console.log(`RentFlex API listening on http://127.0.0.1:${port}`);
});

async function handleApi(req, res) {
  const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
  if (req.method === "OPTIONS") {
    sendNoContent(res);
    return;
  }
  if (req.method === "GET" && url.pathname === "/api/health") {
    sendJson(res, 200, { ok: true });
    return;
  }
  if (req.method === "GET" && url.pathname === "/api/state") {
    sendJson(res, 200, await getState());
    return;
  }
  if (req.method === "POST" && url.pathname === "/api/tenants") {
    const body = await readJson(req);
    await upsertRecord("properties", body.property);
    await upsertRecord("tenants", body.tenant);
    sendJson(res, 201, body);
    return;
  }
  if (req.method === "POST" && url.pathname === "/api/payments") {
    sendJson(res, 201, await upsertRecord("payments", await readJson(req)));
    return;
  }
  if (req.method === "POST" && url.pathname === "/api/promises") {
    sendJson(res, 201, await upsertRecord("promises", await readJson(req)));
    return;
  }
  if (req.method === "POST" && url.pathname === "/api/reminders") {
    sendJson(res, 201, await upsertRecord("reminders", await readJson(req)));
    return;
  }
  if (req.method === "POST" && url.pathname === "/api/plan-acceptances") {
    const acceptance = await readJson(req);
    await upsertRecord("plan_acceptances", acceptance);
    const pdf = {
      id: `plan-pdf-${acceptance.id}`,
      tenantId: acceptance.tenantId,
      fileName: `${acceptance.tenantName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-payment-plan.txt`,
      content: [
        "RentFlex Payment Plan",
        `Tenant: ${acceptance.tenantName}`,
        `Property: ${acceptance.propertyAddress}`,
        `Phone: ${acceptance.phoneNumber}`,
        `Accepted At: ${acceptance.acceptedAt}`,
        `Agreement Version: ${acceptance.agreementVersion}`,
        `Payment Plan: ${acceptance.paymentPlanDescription}`,
        `Next Expected Payment: ${acceptance.nextExpectedPaymentDate}`
      ].join("\n"),
      createdAt: new Date().toISOString()
    };
    await upsertRecord("generated_plan_pdfs", pdf);
    const activityLog = {
      id: `activity-${acceptance.id}`,
      tenantId: acceptance.tenantId,
      title: "Payment Plan Accepted",
      details: `${acceptance.tenantName} at ${acceptance.propertyAddress}`,
      agreementVersion: acceptance.agreementVersion,
      createdAt: new Date().toISOString()
    };
    await upsertRecord("activity_logs", activityLog);
    sendJson(res, 201, { acceptance, generatedPdf: pdf, activityLog });
    return;
  }
  const paydayAction = url.pathname.match(/^\/api\/tenants\/([^/]+)\/payday$/);
  if (req.method === "PATCH" && paydayAction) {
    const [, id] = paydayAction;
    const body = await readJson(req);
    const tenant = await patchRecord("tenants", id, { plan: body.plan });
    if (!tenant) {
      sendJson(res, 404, { error: "Tenant not found" });
      return;
    }
    const activityLog = {
      id: `activity-payday-${Date.now()}`,
      tenantId: id,
      title: "Payday Schedule Updated",
      details: `Next expected payday moved to ${tenant.plan?.nextExpectedPayday ?? "TBD"}`,
      createdAt: new Date().toISOString()
    };
    await upsertRecord("activity_logs", activityLog);
    sendJson(res, 200, { tenant, activityLog });
    return;
  }
  if (req.method === "POST" && url.pathname === "/api/documents") {
    const body = await readJson(req);
    const documents = Array.isArray(body.documents) ? body.documents : [body];
    for (const document of documents) await upsertRecord("documents", document);
    sendJson(res, 201, { documents });
    return;
  }
  const documentAction = url.pathname.match(/^\/api\/documents\/([^/]+)\/(approve|send)$/);
  if (req.method === "PATCH" && documentAction) {
    const [, id, action] = documentAction;
    const now = new Date().toISOString();
    const patch = action === "approve"
      ? { status: "approved", approvedAt: now }
      : { status: "sent", sentAt: now };
    const document = await patchRecord("documents", id, patch);
    if (!document) {
      sendJson(res, 404, { error: "Document not found" });
      return;
    }
    sendJson(res, 200, document);
    return;
  }
  sendJson(res, 404, { error: "Not found" });
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

function sendJson(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS"
  });
  res.end(JSON.stringify(body));
}

function sendNoContent(res) {
  res.writeHead(204, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS"
  });
  res.end();
}

function sendEnvScript(res) {
  const publicEnv = {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
      process.env.VITE_CLERK_PUBLISHABLE_KEY ||
      "",
    VITE_CLERK_PUBLISHABLE_KEY:
      process.env.VITE_CLERK_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
      "",
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
      process.env.VITE_STRIPE_PUBLISHABLE_KEY ||
      "",
    APP_NAME: process.env.APP_NAME || ""
  };

  res
    .writeHead(200, {
      "Content-Type": "application/javascript",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*"
    })
    .end(`window.__PUBLIC_ENV__ = ${JSON.stringify(publicEnv)};`);
}

async function serveStatic(req, res) {
  const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
  const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
  const filePath = join(rootDir, "dist", pathname);
  try {
    const file = await readFile(filePath);
    res.writeHead(200, { "Content-Type": contentType(filePath) });
    res.end(file);
  } catch {
    const index = await readFile(join(rootDir, "dist", "index.html"));
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(index);
  }
}

function contentType(filePath) {
  const types = {
    ".css": "text/css",
    ".html": "text/html",
    ".js": "text/javascript",
    ".json": "application/json",
    ".svg": "image/svg+xml"
  };
  return types[extname(filePath)] ?? "application/octet-stream";
}
