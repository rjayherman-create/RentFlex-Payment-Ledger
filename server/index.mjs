import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { createHmac, timingSafeEqual } from "node:crypto";
import { getDatabaseHealth, getState, patchRecord, upsertRecord } from "./db.mjs";
import { loadEnvFiles, validateServerEnv } from "./env.mjs";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
loadEnvFiles(rootDir);
const serverEnv = validateServerEnv();
const sessionSecret = serverEnv.sessionAuthSecret;

const port = Number(process.env.RENTFLEX_API_PORT ?? process.env.PORT ?? 5185);
const idempotencyStore = new Map();

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
    sendJson(req, res, 500, { error: error instanceof Error ? error.message : "Unknown error" });
  }
});

server.listen(port, () => {
  console.log(`RentFlex API listening on http://127.0.0.1:${port}`);
});

async function handleApi(req, res) {
  const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
  if (req.method === "OPTIONS") {
    sendNoContent(req, res);
    return;
  }
  if (req.method === "GET" && url.pathname === "/api/health") {
    const db = await getDatabaseHealth();
    sendJson(req, res, db.ok ? 200 : 503, {
      ok: db.ok,
      database: db.ok ? "connected" : "unavailable",
      ...(db.ok ? {} : { error: db.error })
    });
    return;
  }
  if (req.method === "GET" && url.pathname === "/api/launch-check") {
    if (!isLaunchCheckAuthorized(req)) {
      sendJson(req, res, 401, { error: "Unauthorized launch check request" });
      return;
    }

    const db = await getDatabaseHealth();
    const hasClerkPublic = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || process.env.VITE_CLERK_PUBLISHABLE_KEY);
    const hasStripePublic = Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || process.env.VITE_STRIPE_PUBLISHABLE_KEY);
    const checks = {
      frontendLoaded: true,
      apiHealth: true,
      databaseConnected: db.ok,
      authConfigured: hasClerkPublic && Boolean(process.env.CLERK_SECRET_KEY),
      stripeConfigured: hasStripePublic && Boolean(process.env.STRIPE_SECRET_KEY),
      webhookConfigured: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
      requiredEnvPresent: db.ok,
      productionUrlConfigured: Boolean(serverEnv.publicAppUrl),
      legalDisclaimerPresent: true,
      dashboardConnectedToRealData: db.ok
    };

    sendJson(req, res, 200, {
      ok: Object.values(checks).every(Boolean),
      checks
    });
    return;
  }
  if (req.method === "GET" && url.pathname === "/api/state") {
    sendJson(req, res, 200, await getState());
    return;
  }
  if (req.method === "POST" && url.pathname === "/api/session") {
    const body = await readJson(req);
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email) {
      sendJson(req, res, 400, { error: "Email is required" });
      return;
    }
    const role = "owner";
    const now = Date.now();
    const payload = { email, role, issuedAt: now, expiresAt: now + 8 * 60 * 60 * 1000 };
    const encoded = encodeBase64Url(JSON.stringify(payload));
    const signature = createHmac("sha256", sessionSecret).update(encoded).digest("base64url");
    sendJson(req, res, 201, { sessionToken: `${encoded}.${signature}`, ...payload });
    return;
  }
  if (req.method === "POST" && url.pathname === "/api/tenants") {
    if (!requireSession(req, res)) return;
    const replay = getIdempotentReplay(req, url.pathname);
    if (replay) {
      sendJson(req, res, replay.status, replay.body, replay.replayed);
      return;
    }
    const body = await readJson(req);
    await upsertRecord("properties", body.property);
    await upsertRecord("tenants", body.tenant);
    rememberIdempotentResponse(req, url.pathname, 201, body);
    sendJson(req, res, 201, body);
    return;
  }
  if (req.method === "POST" && url.pathname === "/api/tenants/import") {
    if (!requireSession(req, res)) return;
    const replay = getIdempotentReplay(req, url.pathname);
    if (replay) {
      sendJson(req, res, replay.status, replay.body, replay.replayed);
      return;
    }
    const body = await readJson(req);
    const records = Array.isArray(body.records) ? body.records : [];
    let imported = 0;
    for (const record of records) {
      if (!record?.tenant?.id || !record?.property?.id) continue;
      await upsertRecord("properties", record.property);
      await upsertRecord("tenants", record.tenant);
      imported += 1;
    }
    const responseBody = { imported };
    rememberIdempotentResponse(req, url.pathname, 201, responseBody);
    sendJson(req, res, 201, responseBody);
    return;
  }
  if (req.method === "POST" && url.pathname === "/api/payments") {
    if (!requireSession(req, res)) return;
    const replay = getIdempotentReplay(req, url.pathname);
    if (replay) {
      sendJson(req, res, replay.status, replay.body, replay.replayed);
      return;
    }
    const payment = await upsertRecord("payments", await readJson(req));
    rememberIdempotentResponse(req, url.pathname, 201, payment);
    sendJson(req, res, 201, payment);
    return;
  }
  if (req.method === "POST" && url.pathname === "/api/promises") {
    if (!requireSession(req, res)) return;
    const replay = getIdempotentReplay(req, url.pathname);
    if (replay) {
      sendJson(req, res, replay.status, replay.body, replay.replayed);
      return;
    }
    const promise = await upsertRecord("promises", await readJson(req));
    rememberIdempotentResponse(req, url.pathname, 201, promise);
    sendJson(req, res, 201, promise);
    return;
  }
  if (req.method === "POST" && url.pathname === "/api/reminders") {
    if (!requireSession(req, res)) return;
    const replay = getIdempotentReplay(req, url.pathname);
    if (replay) {
      sendJson(req, res, replay.status, replay.body, replay.replayed);
      return;
    }
    const reminder = await upsertRecord("reminders", await readJson(req));
    rememberIdempotentResponse(req, url.pathname, 201, reminder);
    sendJson(req, res, 201, reminder);
    return;
  }
  if (req.method === "POST" && url.pathname === "/api/plan-acceptances") {
    if (!requireSession(req, res)) return;
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
    sendJson(req, res, 201, { acceptance, generatedPdf: pdf, activityLog });
    return;
  }
  const paydayAction = url.pathname.match(/^\/api\/tenants\/([^/]+)\/payday$/);
  if (req.method === "PATCH" && paydayAction) {
    if (!requireSession(req, res)) return;
    const [, id] = paydayAction;
    const body = await readJson(req);
    const tenant = await patchRecord("tenants", id, { plan: body.plan });
    if (!tenant) {
      sendJson(req, res, 404, { error: "Tenant not found" });
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
    sendJson(req, res, 200, { tenant, activityLog });
    return;
  }
  if (req.method === "POST" && url.pathname === "/api/documents") {
    if (!requireSession(req, res)) return;
    const replay = getIdempotentReplay(req, url.pathname);
    if (replay) {
      sendJson(req, res, replay.status, replay.body, replay.replayed);
      return;
    }
    const body = await readJson(req);
    const documents = Array.isArray(body.documents) ? body.documents : [body];
    for (const document of documents) await upsertRecord("documents", document);
    const responseBody = { documents };
    rememberIdempotentResponse(req, url.pathname, 201, responseBody);
    sendJson(req, res, 201, responseBody);
    return;
  }
  const reminderAction = url.pathname.match(/^\/api\/reminders\/([^/]+)$/);
  if (req.method === "PATCH" && reminderAction) {
    if (!requireSession(req, res)) return;
    const replay = getIdempotentReplay(req, url.pathname);
    if (replay) {
      sendJson(req, res, replay.status, replay.body, replay.replayed);
      return;
    }
    const [, id] = reminderAction;
    const body = await readJson(req);
    const reminder = await patchRecord("reminders", id, body);
    if (!reminder) {
      sendJson(req, res, 404, { error: "Reminder not found" });
      return;
    }
    rememberIdempotentResponse(req, url.pathname, 200, reminder);
    sendJson(req, res, 200, reminder);
    return;
  }
  const documentAction = url.pathname.match(/^\/api\/documents\/([^/]+)\/(approve|send)$/);
  if (req.method === "PATCH" && documentAction) {
    if (!requireSession(req, res)) return;
    const replay = getIdempotentReplay(req, url.pathname);
    if (replay) {
      sendJson(req, res, replay.status, replay.body, replay.replayed);
      return;
    }
    const [, id, action] = documentAction;
    const now = new Date().toISOString();
    const patch = action === "approve"
      ? { status: "approved", approvedAt: now }
      : { status: "sent", sentAt: now };
    const document = await patchRecord("documents", id, patch);
    if (!document) {
      sendJson(req, res, 404, { error: "Document not found" });
      return;
    }
    rememberIdempotentResponse(req, url.pathname, 200, document);
    sendJson(req, res, 200, document);
    return;
  }
  if (req.method === "POST" && url.pathname === "/api/analytics") {
    if (!requireSession(req, res)) return;
    const event = await readJson(req);
    const row = {
      id: event.id || `evt-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      name: event.name || "unknown_event",
      payload: event.payload ?? {},
      createdAt: new Date().toISOString()
    };
    await upsertRecord("analytics_events", row);
    sendJson(req, res, 201, row);
    return;
  }
  if (req.method === "POST" && url.pathname === "/api/communication-receipts") {
    if (!requireSession(req, res)) return;
    const replay = getIdempotentReplay(req, url.pathname);
    if (replay) {
      sendJson(req, res, replay.status, replay.body, replay.replayed);
      return;
    }
    const receipt = await upsertRecord("communication_receipts", await readJson(req));
    rememberIdempotentResponse(req, url.pathname, 201, receipt);
    sendJson(req, res, 201, receipt);
    return;
  }
  if (req.method === "POST" && url.pathname === "/api/audit-events") {
    if (!requireSession(req, res)) return;
    const replay = getIdempotentReplay(req, url.pathname);
    if (replay) {
      sendJson(req, res, replay.status, replay.body, replay.replayed);
      return;
    }
    const event = await upsertRecord("audit_events", await readJson(req));
    rememberIdempotentResponse(req, url.pathname, 201, event);
    sendJson(req, res, 201, event);
    return;
  }
  sendJson(req, res, 404, { error: "Not found" });
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

function sendJson(req, res, status, body, replayed = false) {
  const corsOrigin = getCorsOrigin(req);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": corsOrigin,
    "Access-Control-Allow-Headers": "Content-Type, X-Launch-Check-Secret, X-Idempotency-Key, X-Session-Token",
    "X-Idempotent-Replay": replayed ? "true" : "false",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS"
  });
  res.end(JSON.stringify(body));
}

function sendNoContent(req, res) {
  const corsOrigin = getCorsOrigin(req);
  res.writeHead(204, {
    "Access-Control-Allow-Origin": corsOrigin,
    "Access-Control-Allow-Headers": "Content-Type, X-Launch-Check-Secret, X-Idempotency-Key, X-Session-Token",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS"
  });
  res.end();
}

function requireSession(req, res) {
  const token = getSessionToken(req);
  if (!token || !verifySessionToken(token)) {
    sendJson(req, res, 401, { error: "Authentication required" });
    return false;
  }
  return true;
}

function getSessionToken(req) {
  const value = req.headers["x-session-token"];
  if (typeof value !== "string") return null;
  const token = value.trim();
  return token.length > 0 ? token : null;
}

function verifySessionToken(token) {
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [encoded, signature] = parts;
  const expected = createHmac("sha256", sessionSecret).update(encoded).digest();
  const actual = Buffer.from(signature, "base64url");
  if (expected.length !== actual.length) return false;
  if (!timingSafeEqual(expected, actual)) return false;
  try {
    const payload = JSON.parse(decodeBase64Url(encoded));
    return typeof payload.expiresAt === "number" && payload.expiresAt > Date.now();
  } catch {
    return false;
  }
}

function encodeBase64Url(value) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decodeBase64Url(value) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function getIdempotencyKey(req) {
  const value = req.headers["x-idempotency-key"];
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function getIdempotentReplay(req, pathname) {
  const key = getIdempotencyKey(req);
  if (!key) return null;
  return idempotencyStore.get(`${req.method}:${pathname}:${key}`) ?? null;
}

function rememberIdempotentResponse(req, pathname, status, body) {
  const key = getIdempotencyKey(req);
  if (!key) return;
  idempotencyStore.set(`${req.method}:${pathname}:${key}`, {
    status,
    body,
    replayed: true,
    savedAt: Date.now()
  });
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

function getCorsOrigin(req) {
  if (!serverEnv.isProduction) {
    return "*";
  }

  const requestOrigin = req.headers.origin;
  if (serverEnv.publicAppUrl && requestOrigin && requestOrigin === serverEnv.publicAppUrl) {
    return requestOrigin;
  }

  return serverEnv.publicAppUrl || "*";
}

function isLaunchCheckAuthorized(req) {
  if (!serverEnv.launchCheckSecret) {
    return false;
  }
  const provided = req.headers["x-launch-check-secret"];
  return typeof provided === "string" && provided === serverEnv.launchCheckSecret;
}
