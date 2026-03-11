const fs = require("fs");
const path = require("path");

const packageJson = require("../../package.json");
const tauriConfig = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "..", "src-tauri", "tauri.conf.json"), "utf8")
);
const cargoToml = fs.readFileSync(path.join(__dirname, "..", "..", "src-tauri", "Cargo.toml"), "utf8");
const cargoVersionMatch = cargoToml.match(/^version = "([^"]+)"$/m);
const packageLock = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "..", "package-lock.json"), "utf8")
);

describe("package.json desktop packaging config", () => {
  test("exposes Tauri-first desktop scripts", () => {
    expect(packageJson.scripts["desktop:dev"]).toBe("node scripts/start-tauri-dev.cjs");
    expect(packageJson.scripts["desktop:build"]).toBe("tauri build");
    expect(packageJson.scripts["desktop:tauri:dev"]).toBe("npm run desktop:dev");
    expect(packageJson.scripts["desktop:tauri:build"]).toBe("npm run desktop:build");
  });

  test("exposes explicit desktop-host test scripts", () => {
    expect(packageJson.scripts["test:desktop"]).toBe(
      "npm run test:dev-host && npm run test:tauri && npm run test:e2e:desktop"
    );
    expect(packageJson.scripts["test:desktop:proof"]).toBe(
      "npm run test:desktop && npm run test:tauri:smoke"
    );
    expect(packageJson.scripts["test:tauri"]).toBe("cargo test --manifest-path src-tauri\\Cargo.toml");
    expect(packageJson.scripts["test:tauri:smoke"]).toBe("node scripts/test-tauri-smoke.cjs");
    expect(packageJson.scripts["test:dev-host"]).toBe(
      "jest --config jest.config.cjs tests/unit/serve-static.jest.test.js --runInBand"
    );
    expect(packageJson.scripts["test:e2e:desktop"]).toBe("playwright test --grep desktop");
  });

  test("keeps browser deploys on Vercel native git integration instead of npm CLI scripts", () => {
    expect(packageJson.scripts["vercel:pull:preview"]).toBeUndefined();
    expect(packageJson.scripts["vercel:pull:production"]).toBeUndefined();
    expect(packageJson.scripts["vercel:build"]).toBeUndefined();
    expect(packageJson.scripts["vercel:deploy:preview"]).toBeUndefined();
    expect(packageJson.scripts["vercel:deploy:production"]).toBeUndefined();
  });

  test("removes the Electron desktop packaging config", () => {
    expect(packageJson.productName).toBe("Multi-TZ Clock");
    expect(packageJson.build).toBeUndefined();
    expect(packageJson.devDependencies.electron).toBeUndefined();
    expect(packageJson.devDependencies["electron-builder"]).toBeUndefined();
  });

  test("keeps Tauri bundle identity aligned with the package metadata", () => {
    expect(cargoVersionMatch).not.toBeNull();
    expect(tauriConfig.productName).toBe(packageJson.productName);
    expect(tauriConfig.version).toBe(packageJson.version);
    expect(cargoVersionMatch[1]).toBe(packageJson.version);
    expect(tauriConfig.identifier).toBe("com.capnc.multi-tz-clock");
    expect(tauriConfig.bundle.active).toBe(true);
  });

  test("keeps Electron packaging dependencies out of the npm lockfile", () => {
    const lockedPackages = Object.keys(packageLock.packages || {});

    expect(lockedPackages).not.toContain("node_modules/electron");
    expect(lockedPackages).not.toContain("node_modules/electron-builder");
    expect(lockedPackages).not.toContain("node_modules/electron-builder-squirrel-windows");
    expect(lockedPackages).not.toContain("node_modules/electron-winstaller");
    expect(lockedPackages.some((packagePath) => packagePath.startsWith("node_modules/@electron/"))).toBe(false);
  });
});
