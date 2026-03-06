#!/usr/bin/env node

const path = require("node:path");
const { spawn } = require("node:child_process");

const electronBinary = require("electron");
const repoRoot = path.resolve(__dirname, "..");
const env = { ...process.env };

delete env.ELECTRON_RUN_AS_NODE;

const child = spawn(electronBinary, [".", ...process.argv.slice(2)], {
  cwd: repoRoot,
  env,
  stdio: "inherit"
});

child.on("error", (error) => {
  console.error(`Unable to start Electron: ${error.message}`);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
