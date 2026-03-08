const http = require("node:http");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const {
  getRequestPath,
  startStaticServer
} = require("../../scripts/serve-static.cjs");

function closeServer(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

function requestUrl(url) {
  return new Promise((resolve, reject) => {
    const request = http.get(url, (response) => {
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => {
        resolve({
          statusCode: response.statusCode,
          headers: response.headers,
          body: Buffer.concat(chunks).toString("utf8")
        });
      });
    });

    request.on("error", reject);
  });
}

describe("scripts/serve-static", () => {
  const openServers = [];

  afterEach(async () => {
    while (openServers.length > 0) {
      await closeServer(openServers.pop());
    }
  });

  test("maps the root request to index.html under the repo root", () => {
    const repoRoot = path.join("C:\\", "repo-root");

    expect(getRequestPath("/", {
      repoRoot,
      host: "127.0.0.1",
      port: 4173
    })).toBe(path.join(repoRoot, "index.html"));
  });

  test("serves index.html from the configured repo root", async () => {
    const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "multi-tz-clock-serve-static-"));
    await fs.writeFile(path.join(repoRoot, "index.html"), "<!doctype html><title>Clock</title>");

    const { server } = await startStaticServer({
      repoRoot,
      host: "127.0.0.1",
      port: 0
    });
    openServers.push(server);

    const port = server.address().port;
    const response = await requestUrl(`http://127.0.0.1:${port}/`);

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toBe("text/html; charset=utf-8");
    expect(response.body).toContain("<title>Clock</title>");
  });

  test("rejects path traversal outside the repo root", async () => {
    const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "multi-tz-clock-serve-static-"));
    await fs.writeFile(path.join(repoRoot, "index.html"), "ok");

    const { server } = await startStaticServer({
      repoRoot,
      host: "127.0.0.1",
      port: 0
    });
    openServers.push(server);

    const port = server.address().port;
    const response = await requestUrl(`http://127.0.0.1:${port}/..%2Fsecret.txt`);

    expect(response.statusCode).toBe(403);
    expect(response.body).toBe("Forbidden");
  });

  test("reports a clear error when the port is already in use", async () => {
    const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "multi-tz-clock-serve-static-"));
    const occupiedServer = http.createServer((_request, response) => {
      response.writeHead(200);
      response.end("occupied");
    });

    await new Promise((resolve) => occupiedServer.listen(0, "127.0.0.1", resolve));
    openServers.push(occupiedServer);
    const occupiedPort = occupiedServer.address().port;

    await expect(startStaticServer({
      repoRoot,
      host: "127.0.0.1",
      port: occupiedPort
    })).rejects.toThrow(
      `Static dev server could not listen on http://127.0.0.1:${occupiedPort} because the port is already in use.`
    );
  });
});
