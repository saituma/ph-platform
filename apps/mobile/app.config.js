const appJson = require("./app.json");

/** Same default as eas.json — used when env is missing during prebuild (e.g. local gradle). */
const DEFAULT_API_BASE_URL = "https://ph-platform.onrender.com/api";

function normalizePlugins(plugins) {
  if (!Array.isArray(plugins)) return [];
  return plugins.filter(Boolean);
}

module.exports = {
  expo: {
    ...appJson.expo,
    plugins: normalizePlugins(appJson.expo.plugins),
    android: appJson.expo.android || {},
    extra: {
      ...(appJson.expo.extra || {}),
      apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL,
      authBaseUrl: (process.env.EXPO_PUBLIC_AUTH_BASE_URL || "").replace(/\/+$/, ""),
    },
  },
};
