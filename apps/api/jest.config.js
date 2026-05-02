const { createDefaultPreset } = require("ts-jest");

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: "node",
  transform: {
    ...tsJestTransformCfg,
  },
  preset: "ts-jest",
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
