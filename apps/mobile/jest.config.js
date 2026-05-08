module.exports = {
  preset: "jest-expo",
  testMatch: ["**/test/**/*.test.ts", "**/test/**/*.test.tsx"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  transformIgnorePatterns: [
    "node_modules/(?!(react-native|@react-native|@react-native-community|@react-navigation|expo|expo-modules-core|@expo|expo-router|expo-secure-store|react-native-gesture-handler|react-native-reanimated|react-native-worklets|nativewind|@reduxjs/toolkit|immer|react-redux|react-native-css-interop|@sentry|zustand|react-native-mmkv|socket\\.io-client|engine\\.io-client|react-native-safe-area-context|react-native-screens|moti|@motify|jose|heroui-native)/)",
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};
