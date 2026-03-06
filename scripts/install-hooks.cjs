#!/usr/bin/env node

const path = require("node:path");
const { execFileSync } = require("node:child_process");

const repoRoot = path.resolve(__dirname, "..");
process.chdir(repoRoot);

execFileSync("git", ["config", "core.hooksPath", ".githooks"], {
  cwd: repoRoot,
  stdio: "inherit",
});

console.log("Git hooks path set to .githooks");
