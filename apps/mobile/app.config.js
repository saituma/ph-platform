const appJson = require("./app.json");

/** Same default as eas.json — used when env is missing during prebuild (e.g. local gradle). */
const DEFAULT_API_BASE_URL = "https://ph-api2.onrender.com/api";

/** Android uses OSM (WebView) for tracking maps — no Google Maps API key in the native app. */
function normalizeReactNativeMapsPlugin(plugins) {
  if (!Array.isArray(plugins)) return plugins;
  return plugins.map((plugin) => {
    if (plugin === "react-native-maps") {
      return "react-native-maps";
    }
    if (Array.isArray(plugin) && plugin[0] === "react-native-maps") {
      return "react-native-maps";
    }
    return plugin;
  });
}

function buildAndroid() {
  const base = { ...(appJson.expo.android || {}) };
  const baseConfig = { ...(base.config || {}) };
  delete baseConfig.googleMaps;
  return { ...base, config: baseConfig };
}

module.exports = {
  expo: {
    ...appJson.expo,
    plugins: normalizeReactNativeMapsPlugin(appJson.expo.plugins),
    android: buildAndroid(),
    extra: {
      ...(appJson.expo.extra || {}),
      apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL,
    },
  },
};
