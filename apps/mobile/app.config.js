const appJson = require("./app.json");

/** Same default as eas.json — used when env is missing during prebuild (e.g. local gradle). */
const DEFAULT_API_BASE_URL = "https://ph-api2.onrender.com/api";
const GOOGLE_MAPS_API_KEY =
  process.env.GOOGLE_MAPS_API_KEY || process.env.ANDROID_GOOGLE_MAPS_API_KEY;

function withPluginConfig(plugins, name, config) {
  if (!Array.isArray(plugins)) return plugins;
  let found = false;
  const next = plugins.map((plugin) => {
    if (plugin === name) {
      found = true;
      return [name, config];
    }
    if (Array.isArray(plugin) && plugin[0] === name) {
      found = true;
      return [name, { ...(plugin[1] || {}), ...config }];
    }
    return plugin;
  });
  if (!found) next.push([name, config]);
  return next;
}

module.exports = {
  expo: {
    ...appJson.expo,
    plugins: GOOGLE_MAPS_API_KEY
      ? withPluginConfig(appJson.expo.plugins, "react-native-maps", {
          googleMapsApiKey: GOOGLE_MAPS_API_KEY,
        })
      : appJson.expo.plugins,
    android: {
      ...(appJson.expo.android || {}),
      ...(GOOGLE_MAPS_API_KEY
        ? {
            config: {
              ...((appJson.expo.android && appJson.expo.android.config) || {}),
              googleMaps: {
                apiKey: GOOGLE_MAPS_API_KEY,
              },
            },
          }
        : {}),
    },
    extra: {
      ...(appJson.expo.extra || {}),
      apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL,
    },
  },
};
