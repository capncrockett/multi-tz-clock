const { resolveRunTarget } = require("../../scripts/agent-guard.cjs");

describe("scripts/agent-guard", () => {
  test("uses cmd.exe for Windows invocations without relying on shell mode", () => {
    expect(resolveRunTarget("npm", ["test"], "win32")).toEqual({
      command: expect.stringMatching(/cmd\.exe$/i),
      args: ["/d", "/s", "/c", "npm test"]
    });
  });

  test("leaves non-Windows commands unchanged", () => {
    expect(resolveRunTarget("npm", ["test"], "linux")).toEqual({
      command: "npm",
      args: ["test"]
    });
  });
});
