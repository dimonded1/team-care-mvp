import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CONTACT_BODY_LIMIT_BYTES,
  createContactCaptureService,
  createRequestIdDeduplicator,
  createSlidingWindowRateLimiter,
  isAllowedOrigin,
  parseAllowedOrigins,
} from "./contact-capture.mjs";

const root = resolve(fileURLToPath(new URL("../dist", import.meta.url)));
const port = Number(process.env.PORT || 8080);
const rateLimit = Number(process.env.CONTACT_CAPTURE_RATE_LIMIT || 5);
const rateWindowMs = Number(process.env.CONTACT_CAPTURE_RATE_WINDOW_MS || 600_000);
const configuredOrigins = parseAllowedOrigins(process.env.APP_ALLOWED_ORIGINS);
const trustProxy = String(process.env.APP_TRUST_PROXY).toLowerCase() === "true";
const contactService = createContactCaptureService();
const limiter = createSlidingWindowRateLimiter({
  limit: Number.isFinite(rateLimit) && rateLimit > 0 ? rateLimit : 5,
  windowMs: Number.isFinite(rateWindowMs) && rateWindowMs > 0 ? rateWindowMs : 600_000,
});
const requestDeduplicator = createRequestIdDeduplicator();

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
};

function securityHeaders() {
  return {
    "content-security-policy": "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; font-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'",
    "referrer-policy": "strict-origin-when-cross-origin",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "permissions-policy": "camera=(), microphone=(), geolocation=()",
  };
}

function sendJson(response, status, body, extraHeaders = {}) {
  response.writeHead(status, {
    ...securityHeaders(),
    "cache-control": "no-store",
    "content-type": "application/json; charset=utf-8",
    ...extraHeaders,
  });
  response.end(JSON.stringify(body));
}

function requestOrigin(request) {
  const forwardedProto = trustProxy
    ? String(request.headers["x-forwarded-proto"] || "").split(",")[0].trim()
    : "";
  const protocol = forwardedProto || (request.socket.encrypted ? "https" : "http");
  const host = request.headers.host || "localhost";
  return `${protocol}://${host}`;
}

function clientAddress(request) {
  const forwarded = trustProxy
    ? String(request.headers["x-forwarded-for"] || "").split(",")[0].trim()
    : "";
  return forwarded || request.socket.remoteAddress || "unknown";
}

async function readJsonBody(request) {
  const contentType = String(request.headers["content-type"] || "").toLowerCase();
  if (!contentType.startsWith("application/json")) {
    const error = new Error("Content-Type must be application/json");
    error.status = 415;
    throw error;
  }

  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > CONTACT_BODY_LIMIT_BYTES) {
      const error = new Error("Request body is too large");
      error.status = 413;
      throw error;
    }
    chunks.push(chunk);
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    const error = new Error("Request body must be valid JSON");
    error.status = 400;
    throw error;
  }
}

async function handleApi(request, response, url) {
  if (url.pathname === "/api/public-config") {
    if (request.method !== "GET") {
      sendJson(response, 405, { error: "method_not_allowed" }, { allow: "GET" });
      return;
    }
    sendJson(response, 200, { contactCaptureEnabled: contactService.isEnabled() });
    return;
  }

  if (url.pathname !== "/api/contact-capture") return false;
  if (request.method !== "POST") {
    sendJson(response, 405, { error: "method_not_allowed" }, { allow: "POST" });
    return true;
  }
  if (!contactService.isEnabled()) {
    sendJson(response, 503, { error: "contact_capture_unavailable" });
    return true;
  }

  const origin = request.headers.origin;
  if (!isAllowedOrigin(origin, requestOrigin(request), configuredOrigins)) {
    sendJson(response, 403, { error: "origin_not_allowed" });
    return true;
  }
  if (!limiter.consume(clientAddress(request))) {
    sendJson(response, 429, { error: "too_many_requests" }, { "retry-after": "600" });
    return true;
  }

  const requestId = String(request.headers["x-request-id"] || "");
  let requestClaimed = false;
  try {
    const payload = await readJsonBody(request);
    if (!requestDeduplicator.claim(requestId)) {
      sendJson(response, 201, { status: "accepted" });
      return true;
    }
    requestClaimed = Boolean(requestId);
    await contactService.submit(payload);
    sendJson(response, 201, { status: "accepted" });
  } catch (error) {
    if (requestClaimed) requestDeduplicator.release(requestId);
    const status = Number(error?.status) || 502;
    sendJson(response, status, {
      error: status === 400
        ? "invalid_contact_request"
        : status < 500
          ? "invalid_request"
          : "contact_capture_failed",
    });
  }
  return true;
}

async function serveStatic(request, response, url) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { ...securityHeaders(), allow: "GET, HEAD" });
    response.end();
    return;
  }

  let decodedPath;
  try {
    decodedPath = decodeURIComponent(url.pathname);
  } catch {
    response.writeHead(400, securityHeaders());
    response.end();
    return;
  }
  const normalizedPath = normalize(decodedPath).replace(/^(\.\.(\/|\\|$))+/, "");
  let filePath = join(root, normalizedPath === "/" ? "index.html" : normalizedPath);
  if (!filePath.startsWith(root)) {
    response.writeHead(404, securityHeaders());
    response.end();
    return;
  }

  try {
    if (!existsSync(filePath) || !(await stat(filePath)).isFile()) {
      filePath = join(root, "index.html");
    }
    const extension = extname(filePath).toLowerCase();
    const immutable = filePath.includes(`${join(root, "assets")}/`);
    const fileStat = await stat(filePath);
    response.writeHead(200, {
      ...securityHeaders(),
      "cache-control": immutable ? "public, max-age=31536000, immutable" : "no-cache",
      "content-length": fileStat.size,
      "content-type": mimeTypes[extension] || "application/octet-stream",
    });
    if (request.method === "HEAD") {
      response.end();
      return;
    }
    createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(404, securityHeaders());
    response.end();
  }
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", "http://localhost");

    if (url.pathname === "/healthz") {
      sendJson(response, 200, { status: "ok" });
      return;
    }

    const handled = await handleApi(request, response, url);
    if (handled !== false) return;
    await serveStatic(request, response, url);
  } catch {
    if (!response.headersSent) sendJson(response, 500, { error: "internal_error" });
    else response.destroy();
  }
});

server.requestTimeout = 10_000;
server.headersTimeout = 12_000;
server.keepAliveTimeout = 5_000;

server.listen(port, "0.0.0.0", () => {
  console.log(`NIKA server listening on port ${port}`);
});
