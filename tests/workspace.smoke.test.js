const fs = require("fs");
const path = require("path");

describe("workspace smoke", () => {
  test("root package.json exists and declares pnpm", () => {
    const pkgPath = path.resolve(__dirname, "../package.json");
    const raw = fs.readFileSync(pkgPath, "utf8");
    const pkg = JSON.parse(raw);
    expect(pkg.packageManager).toMatch(/^pnpm@/);
  });

  test("apps are present", () => {
    const root = path.resolve(__dirname, "../apps");
    const entries = fs.readdirSync(root);
    expect(entries).toEqual(expect.arrayContaining(["api", "web", "mobile"]));
  });
});
