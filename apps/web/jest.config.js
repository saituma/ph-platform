const nextJest = require("next/jest");

const createJestConfig = nextJest({
  dir: "./",
});

/** @type {import("jest").Config} */
const customJestConfig = {
  testEnvironment: "jest-environment-jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testMatch: ["**/test/**/*.test.ts", "**/test/**/*.test.tsx"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    "^react$": "<rootDir>/../../node_modules/react",
    "^react-dom$": "<rootDir>/../../node_modules/react-dom",
    "^react-dom/client$": "<rootDir>/../../node_modules/react-dom/client",
    "^react/jsx-runtime$": "<rootDir>/../../node_modules/react/jsx-runtime.js",
  },
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};

module.exports = createJestConfig(customJestConfig);
