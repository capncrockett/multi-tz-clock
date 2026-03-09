const { spawn } = require("node:child_process");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");

const repoRoot = path.resolve(__dirname, "..");
const executablePath = path.join(repoRoot, "src-tauri", "target", "release", "multi-tz-clock.exe");
const smokeTimeoutMs = Number(process.env.TAURI_SMOKE_TIMEOUT_MS || 90000);

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: repoRoot,
      stdio: "inherit",
      shell: false,
      ...options
    });

    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`));
    });
  });
}

async function waitForFile(filePath, timeoutMs) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      return await fs.readFile(filePath, "utf8");
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  throw new Error(`Timed out waiting for smoke signal at ${filePath}`);
}

function waitForProcessExit(child, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timed out waiting for native smoke process ${child.pid} to exit`));
    }, timeoutMs);

    child.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });

    child.once("exit", (code, signal) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(`Native smoke process exited unsuccessfully (code=${code}, signal=${signal || "none"})`)
      );
    });
  });
}

async function killProcessTree(pid) {
  if (!pid) return;

  if (process.platform === "win32") {
    try {
      await runCommand("taskkill", ["/pid", String(pid), "/t", "/f"], {
        stdio: "ignore"
      });
    } catch {
      // Ignore cleanup failures if the process has already exited.
    }
    return;
  }

  try {
    process.kill(pid, "SIGKILL");
  } catch {
    // Ignore cleanup failures if the process has already exited.
  }
}

async function main() {
  if (process.platform !== "win32") {
    console.log("Skipping native Tauri smoke test outside Windows.");
    return;
  }

  await runCommand("cmd.exe", ["/d", "/s", "/c", "npm run desktop:tauri:build"]);

  const smokeDir = await fs.mkdtemp(path.join(os.tmpdir(), "multi-tz-clock-tauri-smoke-"));
  const signalPath = path.join(smokeDir, "frontend-ready.json");
  let child;

  try {
    child = spawn(executablePath, [], {
      cwd: repoRoot,
      env: {
        ...process.env,
        MULTI_TZ_CLOCK_SMOKE_SIGNAL_PATH: signalPath,
        MULTI_TZ_CLOCK_SMOKE_EXIT_AFTER_READY: "1"
      },
      stdio: "ignore",
      windowsHide: true
    });

    const rawSignal = await waitForFile(signalPath, smokeTimeoutMs);
    const signal = JSON.parse(rawSignal);

    if (signal.windowLabel !== "main") {
      throw new Error(`Unexpected smoke signal window label: ${signal.windowLabel}`);
    }

    if (signal.pid !== child.pid) {
      throw new Error(`Smoke signal pid ${signal.pid} did not match launched pid ${child.pid}`);
    }

    await waitForProcessExit(child, 5000);
    console.log(`Verified native Tauri frontend load via ${signalPath}`);
  } finally {
    await killProcessTree(child?.pid);
    await fs.rm(smokeDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
