#!/usr/bin/env node
/* eslint-disable no-console */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

function exists(p) {
  try {
    fs.accessSync(p, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function readText(p) {
  return fs.readFileSync(p, "utf8");
}

function readJson(p) {
  return JSON.parse(readText(p));
}

function scanFileFor(p, regex) {
  const text = readText(p);
  return regex.test(text);
}

function walkFiles(dir, { exts, ignoreDirs }) {
  const out = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (ignoreDirs && ignoreDirs.has(entry.name)) continue;
      out.push(...walkFiles(full, { exts, ignoreDirs }));
    } else if (entry.isFile()) {
      if (!exts || exts.has(path.extname(entry.name))) out.push(full);
    }
  }
  return out;
}

function scanTreeForAny(dir, regex, { exts } = {}) {
  const ignoreDirs = new Set(["node_modules", ".expo", ".git", "build", "dist"]);
  const files = walkFiles(dir, {
    exts: exts || new Set([".ts", ".tsx", ".js", ".jsx", ".cjs", ".mjs"]),
    ignoreDirs,
  });
  for (const file of files) {
    try {
      if (scanFileFor(file, regex)) return true;
    } catch {
      // ignore unreadable files
    }
  }
  return false;
}

function findPlugin(plugins, name) {
  if (!Array.isArray(plugins)) return null;
  for (const plugin of plugins) {
    if (plugin === name) return { name, config: null, raw: plugin };
    if (Array.isArray(plugin) && plugin[0] === name) {
      return { name, config: plugin[1] ?? null, raw: plugin };
    }
  }
  return null;
}

const results = [];
function ok(message, details) {
  results.push({ level: "OK", message, details });
}
function warn(message, details) {
  results.push({ level: "WARN", message, details });
}
function fail(message, details) {
  results.push({ level: "FAIL", message, details });
}

function rel(p) {
  return path.relative(ROOT, p);
}

function main() {
  const mobileDir = path.join(ROOT, "apps", "mobile");
  const appJsonPath = path.join(mobileDir, "app.json");
  const appConfigPath = path.join(mobileDir, "app.config.js");
  const mobilePkgPath = path.join(mobileDir, "package.json");

  if (!exists(mobileDir)) {
    fail("Missing apps/mobile", { mobileDir: rel(mobileDir) });
    return;
  }

  if (!exists(appJsonPath)) fail("Missing apps/mobile/app.json", { file: rel(appJsonPath) });
  if (!exists(appConfigPath)) warn("Missing apps/mobile/app.config.js", { file: rel(appConfigPath) });
  if (!exists(mobilePkgPath)) fail("Missing apps/mobile/package.json", { file: rel(mobilePkgPath) });

  let appJson;
  let mobilePkg;
  try {
    appJson = readJson(appJsonPath);
    ok("Parsed apps/mobile/app.json", { file: rel(appJsonPath) });
  } catch (e) {
    fail("apps/mobile/app.json is not valid JSON", { file: rel(appJsonPath), error: String(e && e.message ? e.message : e) });
  }

  try {
    mobilePkg = readJson(mobilePkgPath);
    ok("Parsed apps/mobile/package.json", { file: rel(mobilePkgPath) });
  } catch (e) {
    fail("apps/mobile/package.json is not valid JSON", { file: rel(mobilePkgPath), error: String(e && e.message ? e.message : e) });
  }

  // Dependency checks
  if (mobilePkg) {
    const deps = { ...(mobilePkg.dependencies || {}), ...(mobilePkg.devDependencies || {}) };
    const requiredDeps = ["expo-notifications", "expo-constants", "expo-device", "expo-task-manager"];
    for (const dep of requiredDeps) {
      if (deps[dep]) ok(`Dependency present: ${dep}`, { version: deps[dep] });
      else fail(`Missing dependency: ${dep}`, { file: rel(mobilePkgPath) });
    }
  }

  // app.json config checks
  if (appJson && appJson.expo) {
    const expo = appJson.expo;

    const usesBackgroundNotificationProcessing = scanTreeForAny(
      mobileDir,
      /Notifications\.registerTaskAsync\s*\(|registerTaskAsync\s*\(|TaskManager\.defineTask\s*\(\s*['"][^'"]*notification/i,
    );

    const easProjectId = expo?.extra?.eas?.projectId;
    if (typeof easProjectId === "string" && easProjectId.trim()) {
      ok("EAS projectId configured", { projectId: easProjectId });
    } else {
      fail("Missing expo.extra.eas.projectId (needed for getExpoPushTokenAsync)", {
        file: rel(appJsonPath),
        key: "expo.extra.eas.projectId",
      });
    }

    const plugin = findPlugin(expo.plugins, "expo-notifications");
    if (!plugin) {
      fail("expo-notifications config plugin not found in app.json", { file: rel(appJsonPath), key: "expo.plugins" });
    } else {
      ok("expo-notifications plugin configured", { config: plugin.config || null });
      const config = plugin.config || {};
      if (!config.defaultChannel) {
        warn("expo-notifications plugin missing defaultChannel", { suggested: "default" });
      }
      if (typeof config.icon === "string") {
        const iconPath = path.join(mobileDir, config.icon);
        if (exists(iconPath)) ok("expo-notifications icon path exists", { icon: config.icon });
        else warn("expo-notifications icon path does not exist", { icon: config.icon, resolved: rel(iconPath) });
      } else {
        warn("expo-notifications plugin missing icon", { key: "expo.plugins[expo-notifications].icon" });
      }
    }

    const androidPermissions = Array.isArray(expo.android && expo.android.permissions)
      ? expo.android.permissions
      : null;
    if (!androidPermissions) {
      warn("expo.android.permissions not explicitly set", {
        note: "Android 13+ requires POST_NOTIFICATIONS permission to show notifications",
      });
    } else {
      const hasPostNotifs = androidPermissions.includes("android.permission.POST_NOTIFICATIONS");
      if (hasPostNotifs) ok("Android POST_NOTIFICATIONS permission present", {});
      else warn("Android POST_NOTIFICATIONS permission missing", { permission: "android.permission.POST_NOTIFICATIONS" });
    }

    const uiBackgroundModes = expo.ios && expo.ios.infoPlist && expo.ios.infoPlist.UIBackgroundModes;
    if (Array.isArray(uiBackgroundModes) && uiBackgroundModes.includes("remote-notification")) {
      ok("iOS UIBackgroundModes includes remote-notification", {});
    } else if (usesBackgroundNotificationProcessing) {
      warn("iOS UIBackgroundModes missing remote-notification", {
        note: "Your code appears to do background notification processing; add UIBackgroundModes: ['remote-notification'].",
      });
    } else {
      ok("iOS UIBackgroundModes remote-notification not required", {
        note: "No background notification processing detected.",
      });
    }
  }

  // Code checks
  const requiredFiles = {
    notifications: path.join(ROOT, "apps", "mobile", "lib", "notifications.ts"),
    pushRegistration: path.join(ROOT, "apps", "mobile", "lib", "pushRegistration.ts"),
    notificationSetup: path.join(ROOT, "apps", "mobile", "lib", "notificationSetup.ts"),
    inAppContext: path.join(ROOT, "apps", "mobile", "context", "InAppNotificationsContext.tsx"),
  };

  for (const [key, file] of Object.entries(requiredFiles)) {
    if (exists(file)) ok(`Found ${key}`, { file: rel(file) });
    else warn(`Missing ${key}`, { file: rel(file) });
  }

  if (exists(requiredFiles.notifications)) {
    const hasExpoGoGuard = scanFileFor(requiredFiles.notifications, /appOwnership\s*\?\?\s*|ownership\s*===\s*["']expo["']/);
    if (hasExpoGoGuard) ok("Expo Go guard present (returns null in Expo Go)", { file: rel(requiredFiles.notifications) });
    else warn("No Expo Go guard found; Expo Go can’t receive remote push notifications", { file: rel(requiredFiles.notifications) });

    const hasWebGuard = scanFileFor(requiredFiles.notifications, /Platform\.OS\s*===\s*["']web["']/);
    if (!hasWebGuard) {
      warn("No explicit web guard found in getNotifications()", {
        note: "If you run the app on web, consider returning null on Platform.OS === 'web'.",
        file: rel(requiredFiles.notifications),
      });
    }
  }

  if (exists(requiredFiles.pushRegistration)) {
    const hasTokenCall = scanFileFor(requiredFiles.pushRegistration, /getExpoPushTokenAsync\s*\(/);
    if (hasTokenCall) ok("Push token registration uses getExpoPushTokenAsync", { file: rel(requiredFiles.pushRegistration) });
    else fail("No getExpoPushTokenAsync call found; push token registration may be incomplete", { file: rel(requiredFiles.pushRegistration) });
  }

  if (exists(requiredFiles.inAppContext)) {
    const hasHandler = scanFileFor(requiredFiles.inAppContext, /setNotificationHandler\s*\(/);
    if (hasHandler) ok("Foreground notification handler configured (setNotificationHandler)", { file: rel(requiredFiles.inAppContext) });
    else warn("No setNotificationHandler call found; foreground push may be silent", { file: rel(requiredFiles.inAppContext) });

    const hasReceiveListener = scanFileFor(requiredFiles.inAppContext, /addNotificationReceivedListener\s*\(/);
    if (hasReceiveListener) ok("Foreground receive listener present", { file: rel(requiredFiles.inAppContext) });
    else warn("No addNotificationReceivedListener found", { file: rel(requiredFiles.inAppContext) });
  }

  // Print report
  const counts = results.reduce(
    (acc, r) => {
      acc[r.level] = (acc[r.level] || 0) + 1;
      return acc;
    },
    { OK: 0, WARN: 0, FAIL: 0 },
  );

  console.log("\nExpo Notifications Validation\n=============================\n");
  for (const r of results) {
    const prefix = r.level.padEnd(4);
    console.log(`${prefix}  ${r.message}`);
    if (r.details) {
      const detailText = JSON.stringify(r.details, null, 2)
        .split("\n")
        .map((line) => `      ${line}`)
        .join("\n");
      console.log(detailText);
    }
  }

  console.log("\nSummary\n-------");
  console.log(`OK: ${counts.OK}  WARN: ${counts.WARN}  FAIL: ${counts.FAIL}`);

  if (counts.FAIL > 0) {
    process.exitCode = 1;
  }
}

main();
