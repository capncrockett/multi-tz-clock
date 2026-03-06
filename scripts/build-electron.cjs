#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");

const mode = process.argv[2];
const repoRoot = path.resolve(__dirname, "..");
const distRoot = path.join(repoRoot, "dist");

function getElectronBuilderBin() {
  return path.join(
    repoRoot,
    "node_modules",
    ".bin",
    process.platform === "win32" ? "electron-builder.cmd" : "electron-builder"
  );
}

function resolveOutputDir(baseName) {
  let attempt = 0;

  while (true) {
    const suffix = attempt === 0 ? "" : `-${attempt + 1}`;
    const outputDir = path.join(distRoot, `${baseName}${suffix}`);
    if (!fs.existsSync(outputDir)) {
      return outputDir;
    }
    attempt += 1;
  }
}

function getBuilderArgs(selectedMode, outputDir) {
  if (selectedMode === "pack") {
    return ["--dir", `--config.directories.output=${outputDir}`];
  }
  if (selectedMode === "dist") {
    return ["--win", "nsis", `--config.directories.output=${outputDir}`];
  }

  throw new Error(`Unknown build mode: ${selectedMode}`);
}

if (!mode) {
  console.error("Usage: node scripts/build-electron.cjs <pack|dist>");
  process.exit(1);
}

let outputDir;
let args;
try {
  outputDir = resolveOutputDir(mode);
  args = getBuilderArgs(mode, outputDir);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

console.log(`Building desktop package into ${path.relative(repoRoot, outputDir)}`);

const child = spawn(getElectronBuilderBin(), args, {
  cwd: repoRoot,
  env: {
    ...process.env,
    CSC_IDENTITY_AUTO_DISCOVERY: "false"
  },
  shell: process.platform === "win32",
  stdio: "inherit"
});

child.on("error", (error) => {
  console.error(`Unable to start electron-builder: ${error.message}`);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
