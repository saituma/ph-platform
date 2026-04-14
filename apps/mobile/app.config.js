const appJson = require("./app.json");

/** Same default as eas.json — used when env is missing during prebuild (e.g. local gradle). */
const DEFAULT_API_BASE_URL = "https://ph-platform.onrender.com/api";
const GOOGLE_MAPS_API_KEY =
  process.env.GOOGLE_MAPS_API_KEY || process.env.ANDROID_GOOGLE_MAPS_API_KEY;

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
