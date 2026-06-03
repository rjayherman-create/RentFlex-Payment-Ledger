import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { getState, patchRecord, upsertRecord } from "./db.mjs";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const port = Number(process.env.PORT ?? 5185);

const server = createServer(async (req, res) => {
  try {
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
  if (req.method === "GET" && url.pathname === "/api/health") {
    sendJson(res, 200, { ok: true });
    return;
  }
  if (req.method === "GET" && url.pathname === "/api/state") {
    sendJson(res, 200, getState());
    return;
  }
  if (req.method === "POST" && url.pathname === "/api/tenants") {
    const body = await readJson(req);
    upsertRecord("properties", body.property);
    upsertRecord("tenants", body.tenant);
    sendJson(res, 201, body);
    return;
  }
  if (req.method === "POST" && url.pathname === "/api/payments") {
    sendJson(res, 201, upsertRecord("payments", await readJson(req)));
    return;
  }
  if (req.method === "POST" && url.pathname === "/api/promises") {
    sendJson(res, 201, upsertRecord("promises", await readJson(req)));
    return;
  }
  if (req.method === "POST" && url.pathname === "/api/reminders") {
    sendJson(res, 201, upsertRecord("reminders", await readJson(req)));
    return;
  }
  if (req.method === "POST" && url.pathname === "/api/documents") {
    const body = await readJson(req);
    const documents = Array.isArray(body.documents) ? body.documents : [body];
    for (const document of documents) upsertRecord("documents", document);
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
    const document = patchRecord("documents", id, patch);
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
