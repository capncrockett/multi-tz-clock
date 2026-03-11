#!/usr/bin/env node

// This guard is intentionally repo-local and must only operate against the
// repository that contains this script.

const fs = require("node:fs");
const path = require("node:path");
const { execFileSync, spawnSync } = require("node:child_process");

const repoRoot = path.resolve(__dirname, "..");
process.chdir(repoRoot);

function git(args) {
  return execFileSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function quoteCmdArg(value) {
  if (value === "") return '""';
  if (!/[\s"]/u.test(value)) return value;
  return `"${String(value).replace(/"/g, '\\"')}"`;
}

function resolveRunTarget(command, args, platform = process.platform) {
  if (platform === "win32") {
    const cmdLine = [command, ...args].map(quoteCmdArg).join(" ");
    return {
      command: process.env.comspec || "cmd.exe",
      args: ["/d", "/s", "/c", cmdLine],
    };
  }

  return { command, args };
}

function run(command, args) {
  const target = resolveRunTarget(command, args);
  const result = spawnSync(target.command, target.args, {
    cwd: repoRoot,
    shell: false,
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  return result.status ?? 1;
}

function fail(message) {
  console.error(`agent-guard: ${message}`);
  process.exit(1);
}

function ensureRepoLocalScope() {
  try {
    const topLevel = git(["rev-parse", "--show-toplevel"]);
    if (path.resolve(topLevel) !== repoRoot) {
      fail(`guard scope mismatch: expected ${repoRoot}, received ${topLevel}`);
    }
  } catch (error) {
    fail(`guard must run inside this repository only (${error.message || error})`);
  }
}

function getLines(value) {
  if (!value) {
    return [];
  }

  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function getStagedFiles() {
  return getLines(git(["diff", "--cached", "--name-only", "--diff-filter=ACMR"]));
}

function getUnstagedFiles() {
  return getLines(git(["diff", "--name-only"]));
}

function getUntrackedFiles() {
  return getLines(git(["ls-files", "--others", "--exclude-standard"]));
}

function isDocsOnly(files) {
  return files.length > 0 && files.every((file) => {
    return (
      file === "AGENTS.md" ||
      file.endsWith(".md")
    );
  });
}

function ensureCleanPromptCheckpoint() {
  const unstaged = getUnstagedFiles();
  if (unstaged.length > 0) {
    fail(
      `commit blocked because unstaged tracked changes remain: ${unstaged.join(", ")}`
    );
  }

  const untracked = getUntrackedFiles().filter((file) => {
    return !file.startsWith("playwright-report/") && !file.startsWith("test-results/");
  });

  if (untracked.length > 0) {
    fail(`commit blocked because untracked files remain: ${untracked.join(", ")}`);
  }
}

function runFullSuite() {
  const status = run("npm", ["test"]);
  if (status !== 0) {
    fail("full test suite failed");
  }
}

function handlePreCommit() {
  const stagedFiles = getStagedFiles();
  if (stagedFiles.length === 0) {
    fail("nothing is staged for commit");
  }

  ensureCleanPromptCheckpoint();

  if (isDocsOnly(stagedFiles)) {
    console.log("agent-guard: docs-only commit detected, skipping test suite");
    return;
  }

  console.log("agent-guard: running full test suite before commit");
  runFullSuite();
}

function handlePrePush() {
  const statusOutput = git(["status", "--porcelain"]);
  if (statusOutput) {
    fail("push blocked because the working tree is not clean");
  }

  console.log("agent-guard: running full test suite before push");
  runFullSuite();
}

function handleCommitMessage() {
  const messageFile = process.argv[3];
  if (!messageFile) {
    fail("commit-msg hook requires the commit message file path");
  }

  const firstLine = fs.readFileSync(messageFile, "utf8").split(/\r?\n/)[0].trim();
  if (!firstLine) {
    fail("commit message cannot be empty");
  }

  if (/^(Merge|Revert)/.test(firstLine)) {
    return;
  }

  const format =
    /^(feat|fix|docs|refactor|test|chore|build|ci|revert)(\([a-z0-9._/-]+\))?: [A-Za-z0-9].{7,}$/;

  if (!format.test(firstLine)) {
    fail(
      "commit message must use conventional format like 'fix(clock): adjust hand spacing'"
    );
  }

  if (/\b(wip|tmp|stuff|misc|update|fixup)\b/i.test(firstLine)) {
    fail("commit message is too vague");
  }
}

function main(argv = process.argv) {
  const mode = argv[2];

  if (!mode) {
    fail("Usage: node scripts/agent-guard.cjs <pre-commit|pre-push|commit-msg> [args]");
  }

  switch (mode) {
    case "pre-commit":
      ensureRepoLocalScope();
      handlePreCommit();
      break;
    case "pre-push":
      ensureRepoLocalScope();
      handlePrePush();
      break;
    case "commit-msg":
      ensureRepoLocalScope();
      handleCommitMessage();
      break;
    default:
      fail(`unknown mode '${mode}'`);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  main,
  resolveRunTarget,
};
