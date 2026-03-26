const appJson = require("./app.json");

/** Same default as eas.json — used when env is missing during prebuild (e.g. local gradle). */
const DEFAULT_API_BASE_URL = "https://ph-api2.onrender.com/api";

module.exports = {
  expo: {
    ...appJson.expo,
    extra: {
      ...(appJson.expo.extra || {}),
      apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL,
    },
  },
};
