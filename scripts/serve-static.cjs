const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");
const host = process.env.STATIC_HOST || "127.0.0.1";
const port = Number(process.env.STATIC_PORT || 4173);

const MIME_TYPES = Object.freeze({
  ".css": "text/css; charset=utf-8",
  ".cjs": "text/javascript; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8"
});

function getRequestPath(urlValue) {
  const url = new URL(urlValue || "/", `http://${host}:${port}`);
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === "/") {
    pathname = "/index.html";
  }

  const safePath = path.normalize(pathname.replace(/^\/+/, ""));
  return path.join(repoRoot, safePath);
}

function sendFile(response, filePath) {
  fs.readFile(filePath, (error, buffer) => {
    if (error) {
      response.writeHead(error.code === "ENOENT" ? 404 : 500, {
        "Content-Type": "text/plain; charset=utf-8"
      });
      response.end(error.code === "ENOENT" ? "Not found" : "Server error");
      return;
    }

    response.writeHead(200, {
      "Content-Type": MIME_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-store"
    });
    response.end(buffer);
  });
}

const server = http.createServer((request, response) => {
  const filePath = getRequestPath(request.url);
  if (!filePath.startsWith(repoRoot)) {
    response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Forbidden");
    return;
  }

  fs.stat(filePath, (error, stats) => {
    if (error) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    if (stats.isDirectory()) {
      sendFile(response, path.join(filePath, "index.html"));
      return;
    }

    sendFile(response, filePath);
  });
});

server.listen(port, host, () => {
  console.log(`Serving ${repoRoot} at http://${host}:${port}`);
});
