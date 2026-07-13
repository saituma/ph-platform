const { createDefaultPreset } = require("ts-jest");

// Transpile-only. Type-checking every test run builds a full TS program over src/, and
// Drizzle's generics on the 2,600-line schema push that past Node's 4GB heap — the suite
// OOMed before a single test ran. Types are already checked by the separate `test:types`
// step (`"test": "pnpm run test:types && jest"`), so doing it again here bought nothing.
const tsJestTransformCfg = createDefaultPreset({ isolatedModules: true }).transform;

/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: "node",
  transform: {
    ...tsJestTransformCfg,
  },
  testMatch: ["**/test/**/*.test.ts"],
  testPathIgnorePatterns:
    process.env.API_INTEGRATION === "1"
      ? []
      : ["<rootDir>/test/api.test.ts", "<rootDir>/test/integration"],
  setupFiles: ["<rootDir>/test/jest.setup.ts"],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
