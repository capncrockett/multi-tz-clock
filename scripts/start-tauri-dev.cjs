#!/usr/bin/env node

const { spawn } = require("node:child_process");
const path = require("node:path");

const { startStaticServer } = require("./serve-static.cjs");

const repoRoot = path.resolve(__dirname, "..");
const host = process.env.STATIC_HOST || "127.0.0.1";
const port = Number(process.env.STATIC_PORT || 4173);
const healthTimeoutMs = Number(process.env.TAURI_DEV_HEALTH_TIMEOUT_MS || 1500);

function quoteCmdArg(value) {
  if (value === "") return '""';
  if (!/[\s"]/u.test(value)) return value;
  return `"${String(value).replace(/"/g, '\\"')}"`;
}

async function isDevServerReady({ host, port, timeoutMs = healthTimeoutMs }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`http://${host}:${port}/`, {
      signal: controller.signal,
      headers: {
        "Cache-Control": "no-store"
      }
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function ensureDevServer({
  repoRoot,
  host,
  port,
  startServer = startStaticServer
}) {
  try {
    const context = await startServer({ repoRoot, host, port });
    return { ...context, reused: false };
  } catch (error) {
    if (!error?.message || !error.message.includes("already in use")) {
      throw error;
    }

    const healthy = await isDevServerReady({ host, port });
    if (!healthy) {
      throw error;
    }

    return {
      repoRoot,
      host,
      port,
      server: null,
      reused: true
    };
  }
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: repoRoot,
      stdio: "inherit",
      shell: false,
      ...options
    });

    child.once("error", reject);
    child.once("exit", (code, signal) => {
      resolve({ code, signal });
    });
  });
}

async function terminateProcessTree(pid) {
  if (!pid || process.platform !== "win32") {
    return;
  }

  try {
    await runCommand("taskkill", ["/pid", String(pid), "/t", "/f"], {
      stdio: "ignore"
    });
  } catch {
    // Ignore cleanup failures if the process is already gone.
  }
}

async function main() {
  const devServer = await ensureDevServer({ repoRoot, host, port });
  if (devServer.reused) {
    console.log(`Reusing existing static server at http://${host}:${port}`);
  } else {
    console.log(`Serving ${repoRoot} at http://${host}:${port}`);
  }

  const tauriArgs = ["npm", "run", "tauri", "--", "dev", ...process.argv.slice(2)]
    .map(quoteCmdArg)
    .join(" ");
  const tauriChild = spawn("cmd.exe", ["/d", "/s", "/c", tauriArgs], {
    cwd: repoRoot,
    stdio: "inherit",
    windowsHide: false
  });

  let cleaningUp = false;

  async function cleanup(signal) {
    if (cleaningUp) {
      return;
    }
    cleaningUp = true;

    await terminateProcessTree(tauriChild.pid);
    if (devServer.server) {
      await new Promise((resolve) => devServer.server.close(resolve));
    }

    if (signal) {
      process.kill(process.pid, signal);
    }
  }

  process.on("SIGINT", () => {
    void cleanup("SIGINT");
  });
  process.on("SIGTERM", () => {
    void cleanup("SIGTERM");
  });

  tauriChild.once("error", async (error) => {
    console.error(`Unable to start Tauri dev: ${error.message}`);
    await cleanup();
    process.exit(1);
  });

  tauriChild.once("exit", async (code, signal) => {
    await cleanup();
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? 0);
  });
}

if (require.main === module) {
  void main().catch((error) => {
    console.error(error.message || error);
    process.exit(1);
  });
}

module.exports = {
  ensureDevServer,
  isDevServerReady,
  quoteCmdArg
};
