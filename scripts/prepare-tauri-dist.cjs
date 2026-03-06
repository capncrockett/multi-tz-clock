const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");
const outputDir = path.join(repoRoot, ".tauri-dist");
const entriesToCopy = [
  { from: path.join(repoRoot, "index.html"), to: path.join(outputDir, "index.html") },
  { from: path.join(repoRoot, "assets"), to: path.join(outputDir, "assets") }
];

function copyEntry(sourcePath, destinationPath) {
  const stats = fs.statSync(sourcePath);
  if (stats.isDirectory()) {
    fs.mkdirSync(destinationPath, { recursive: true });
    for (const childName of fs.readdirSync(sourcePath)) {
      copyEntry(path.join(sourcePath, childName), path.join(destinationPath, childName));
    }
    return;
  }

  fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
  fs.copyFileSync(sourcePath, destinationPath);
}

fs.rmSync(outputDir, { recursive: true, force: true });
for (const entry of entriesToCopy) {
  copyEntry(entry.from, entry.to);
}

console.log(`Prepared Tauri frontend assets in ${outputDir}`);
