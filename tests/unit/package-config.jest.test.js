const packageJson = require("../../package.json");

describe("package.json desktop packaging config", () => {
  test("exposes explicit Electron packaging scripts", () => {
    expect(packageJson.scripts["desktop:pack"]).toBe("node scripts/build-electron.cjs pack");
    expect(packageJson.scripts["desktop:dist"]).toBe("node scripts/build-electron.cjs dist");
  });

  test("exposes explicit desktop-host test scripts", () => {
    expect(packageJson.scripts["test:desktop"]).toBe(
      "npm run test:dev-host && npm run test:tauri && npm run test:e2e:desktop"
    );
    expect(packageJson.scripts["test:tauri"]).toBe("cargo test --manifest-path src-tauri\\Cargo.toml");
    expect(packageJson.scripts["test:dev-host"]).toBe(
      "jest --config jest.config.cjs tests/unit/serve-static.jest.test.js --runInBand"
    );
    expect(packageJson.scripts["test:e2e:desktop"]).toBe("playwright test --grep desktop");
  });

  test("defines a Windows installer build for the desktop app", () => {
    expect(packageJson.productName).toBe("Multi-TZ Clock");
    expect(packageJson.build).toMatchObject({
      appId: "com.capnc.multi-tz-clock",
      productName: "Multi-TZ Clock",
      asar: true,
      directories: {
        buildResources: "build",
        output: "dist"
      },
      win: {
        target: ["nsis"],
        icon: "build/icon.png",
        signAndEditExecutable: false,
        artifactName: "${productName}-Setup-${version}.${ext}"
      },
      nsis: {
        oneClick: false,
        allowToChangeInstallationDirectory: true,
        createDesktopShortcut: false,
        createStartMenuShortcut: true,
        shortcutName: "Multi-TZ Clock"
      }
    });
    expect(packageJson.build.files).toEqual([
      "index.html",
      "assets/**/*",
      "desktop/**/*.cjs",
      "package.json"
    ]);
  });
});
