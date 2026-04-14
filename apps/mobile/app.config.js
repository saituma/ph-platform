const appJson = require("./app.json");

/** Same default as eas.json — used when env is missing during prebuild (e.g. local gradle). */
const DEFAULT_API_BASE_URL = "https://ph-platform.onrender.com/api";

function getAndroidGoogleMapsApiKey() {
  return (
    process.env.ANDROID_GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.EXPO_PUBLIC_ANDROID_GOOGLE_MAPS_API_KEY ||
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
  );
}

function buildAndroid() {
  const android = { ...(appJson.expo.android || {}) };

  const apiKey = getAndroidGoogleMapsApiKey();
  if (!apiKey) return android;

  return {
    ...android,
    config: {
      ...(android.config || {}),
      googleMaps: {
        ...(android.config?.googleMaps || {}),
        apiKey,
      },
    },
  };
}

function normalizeReactNativeMapsPlugin(plugins) {
  if (!Array.isArray(plugins)) return [];

  // Keep plugins exactly as declared in app.json, but ensure we never
  // accidentally pass `undefined` to Expo's config evaluation.
  return plugins.filter(Boolean);
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
