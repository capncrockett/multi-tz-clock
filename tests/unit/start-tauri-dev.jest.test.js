const http = require("node:http");

const {
  ensureDevServer,
  isDevServerReady,
  quoteCmdArg
} = require("../../scripts/start-tauri-dev.cjs");

function listen(server, port = 0) {
  return new Promise((resolve) => {
    server.listen(port, "127.0.0.1", resolve);
  });
}

function close(server) {
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

describe("scripts/start-tauri-dev", () => {
  test("quotes command arguments for cmd.exe safely", () => {
    expect(quoteCmdArg("tauri")).toBe("tauri");
    expect(quoteCmdArg("with spaces")).toBe("\"with spaces\"");
    expect(quoteCmdArg("say \"hi\"")).toBe("\"say \\\"hi\\\"\"");
  });

  test("detects when the static dev server is reachable", async () => {
    const server = http.createServer((_request, response) => {
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      response.end("<!doctype html>");
    });

    await listen(server);
    const port = server.address().port;

    await expect(isDevServerReady({
      host: "127.0.0.1",
      port,
      timeoutMs: 500
    })).resolves.toBe(true);

    await close(server);
  });

  test("reuses a healthy existing static server when the port is already in use", async () => {
    const server = http.createServer((_request, response) => {
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      response.end("<!doctype html>");
    });

    await listen(server);
    const port = server.address().port;

    const result = await ensureDevServer({
      repoRoot: "C:\\Users\\capnc\\Codin\\multi-tz-clock",
      host: "127.0.0.1",
      port,
      startServer: async () => {
        throw new Error(`Static dev server could not listen on http://127.0.0.1:${port} because the port is already in use.`);
      }
    });

    expect(result).toEqual(expect.objectContaining({
      host: "127.0.0.1",
      port,
      reused: true,
      server: null
    }));

    await close(server);
  });

  test("fails when the port is in use but no healthy dev server is available", async () => {
    await expect(ensureDevServer({
      repoRoot: "C:\\Users\\capnc\\Codin\\multi-tz-clock",
      host: "127.0.0.1",
      port: 41739,
      startServer: async () => {
        throw new Error("Static dev server could not listen on http://127.0.0.1:41739 because the port is already in use.");
      }
    })).rejects.toThrow("already in use");
  });
});
