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
    "../../google-services.json",
  ].filter(Boolean);
  const iosCandidates = [
    iosOverride,
    "./GoogleService-Info.plist",
    "../GoogleService-Info.plist",
    "../../GoogleService-Info.plist",
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

// NOTE: Universal Links (iOS) and App Links (Android) are configured in app.json.
// For these to work, each linked domain must serve verification files:
//   iOS  -> https://<domain>/.well-known/apple-app-site-association
//           { "applinks": { "apps": [], "details": [{ "appIDs": ["<TEAM_ID>.com.clientreachai.phperformance"], "paths": ["*"] }] } }
//   Android -> https://<domain>/.well-known/assetlinks.json
//           [{ "relation": ["delegate_permission/common.handle_all_urls"],
//              "target": { "namespace": "android_app", "package_name": "com.clientreachai.phperformance",
//                          "sha256_cert_fingerprints": ["<SHA256_FROM_KEYSTORE>"] } }]
// Domains: ph-platform-onboarding.vercel.app, ph-performance-2cae29f7922d.herokuapp.com

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
