const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");
const outputDir = path.join(repoRoot, ".tauri-dist");
const entriesToCopy = [
  { from: path.join(repoRoot, "index.html"), to: path.join(outputDir, "index.html") },
  { from: path.join(repoRoot, "assets"), to: path.join(outputDir, "assets") },
  { from: path.join(repoRoot, "android-chrome-192x192.png"), to: path.join(outputDir, "android-chrome-192x192.png") },
  { from: path.join(repoRoot, "android-chrome-512x512.png"), to: path.join(outputDir, "android-chrome-512x512.png") },
  { from: path.join(repoRoot, "apple-touch-icon.png"), to: path.join(outputDir, "apple-touch-icon.png") },
  { from: path.join(repoRoot, "favicon-16x16.png"), to: path.join(outputDir, "favicon-16x16.png") },
  { from: path.join(repoRoot, "favicon-32x32.png"), to: path.join(outputDir, "favicon-32x32.png") },
  { from: path.join(repoRoot, "favicon.ico"), to: path.join(outputDir, "favicon.ico") },
  { from: path.join(repoRoot, "site.webmanifest"), to: path.join(outputDir, "site.webmanifest") }
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
