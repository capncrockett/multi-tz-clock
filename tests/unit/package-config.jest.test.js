const packageJson = require("../../package.json");

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

  test("removes the Electron desktop packaging config", () => {
    expect(packageJson.productName).toBe("Multi-TZ Clock");
    expect(packageJson.build).toBeUndefined();
    expect(packageJson.devDependencies.electron).toBeUndefined();
    expect(packageJson.devDependencies["electron-builder"]).toBeUndefined();
  });
});
