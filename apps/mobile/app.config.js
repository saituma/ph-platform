const appJson = require("./app.json");
const fs = require("fs");
const path = require("path");
const os = require("os");

function getLocalIP() {
  try {
    const interfaces = os.networkInterfaces();
    for (const interfaceName in interfaces) {
      const addresses = interfaces[interfaceName] || [];
      for (const iface of addresses) {
        if (iface.family === "IPv4" && !iface.internal) {
          return iface.address;
        }
      }
    }
  } catch {
    // Fall back to localhost when interface discovery is unavailable.
  }

  return "localhost";
}

const localIP = getLocalIP();
/** Same default as eas.json — used when env is missing during prebuild (e.g. local gradle). */
const DEFAULT_API_BASE_URL = process.env.NODE_ENV === "development" || !process.env.EAS_BUILD
  ? `http://${localIP}:3001/api`
  : "https://ph-platform.onrender.com/api";

function normalizePlugins(plugins) {
  if (!Array.isArray(plugins)) return [];
  return plugins.filter(Boolean);
}

function maybeAttachGoogleServicesFiles(expoConfig) {
  const androidOverride = process.env.EXPO_ANDROID_GOOGLE_SERVICES_FILE;
  const iosOverride = process.env.EXPO_IOS_GOOGLE_SERVICES_FILE;

  const androidCandidates = [
    androidOverride,
    "./google-services.json",
    "../google-services.json",
  ].filter(Boolean);
  const iosCandidates = [
    iosOverride,
    "./GoogleService-Info.plist",
    "../GoogleService-Info.plist",
  ].filter(Boolean);

  const pickExisting = (candidates) => {
    for (const candidate of candidates) {
      try {
        const abs = path.resolve(__dirname, candidate);
        if (fs.existsSync(abs)) return candidate;
      } catch {
        // ignore
      }
    }
    return null;
  };

  const androidCandidate = pickExisting(androidCandidates);
  const iosCandidate = pickExisting(iosCandidates);

  if (androidCandidate) {
    expoConfig.android = {
      ...(expoConfig.android ?? {}),
      googleServicesFile: androidCandidate,
    };
  }

  if (iosCandidate) {
    expoConfig.ios = {
      ...(expoConfig.ios ?? {}),
      googleServicesFile: iosCandidate,
    };
  }

  return expoConfig;
}

module.exports = {
  expo: {
    ...maybeAttachGoogleServicesFiles({
      ...appJson.expo,
      plugins: normalizePlugins(appJson.expo.plugins),
      android: appJson.expo.android || {},
      extra: {
        ...(appJson.expo.extra || {}),
        apiBaseUrl:
          process.env.EXPO_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL,
        authBaseUrl: (process.env.EXPO_PUBLIC_AUTH_BASE_URL || "").replace(
          /\/+$/,
          "",
        ),
      },
    }),
  },
};
