/**
 * Expo config plugin that injects Android network_security_config.xml
 * with certificate public-key pins for the production API domain.
 *
 * On iOS, App Transport Security (ATS) already enforces TLS 1.2+ by default.
 * Native-level SSL pinning on iOS requires a custom NSURLSessionDelegate which
 * is not feasible in Expo managed workflow — application-layer pinning in
 * lib/ssl/pinning.ts covers both platforms.
 */
const {
  withAndroidManifest,
  AndroidConfig,
} = require("expo/config-plugins");
const { mkdirSync, writeFileSync, existsSync } = require("fs");
const { resolve } = require("path");

/**
 * SPKI SHA-256 pins (base64).
 * Pin the intermediate CA so leaf-cert renewals don't break the app.
 * The leaf pin is kept as a backup.
 *
 * Chain (as of 2025):
 *   Leaf:         *.herokuapp.com  — Amazon RSA
 *   Intermediate: Amazon RSA 2048 M01
 *   Root:         Amazon Root CA 1
 */
const PINS = {
  // Amazon RSA 2048 M01 (intermediate — stable across leaf renewals)
  intermediate: "DxH4tt40L+eduF6szpY6TONlxhZhBd+pJ9wbHlQ2fuw=",
  // Amazon Root CA 1
  root: "++MBgDH5WGvL9Bcn5Be30cRcL0f5O+NyoXuWtQdX1aI=",
  // Current leaf *.herokuapp.com (rotates on renewal)
  leaf: "zPmj1OeCeE7wvb14A9vzpn0bRzv71/H4Uy8KejME7Qg=",
};

const NETWORK_SECURITY_CONFIG_XML = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <!-- Production API domain: enforce certificate pinning -->
  <domain-config cleartextTrafficPermitted="false">
    <domain includeSubdomains="true">herokuapp.com</domain>
    <pin-set expiration="2027-01-01">
      <pin digest="SHA-256">${PINS.intermediate}</pin>
      <pin digest="SHA-256">${PINS.root}</pin>
      <pin digest="SHA-256">${PINS.leaf}</pin>
    </pin-set>
  </domain-config>

  <!-- Default: allow normal HTTPS, block cleartext -->
  <base-config cleartextTrafficPermitted="false">
    <trust-anchors>
      <certificates src="system" />
    </trust-anchors>
  </base-config>

  <!-- Debug builds: allow local cleartext for dev server -->
  <debug-overrides>
    <trust-anchors>
      <certificates src="system" />
      <certificates src="user" />
    </trust-anchors>
  </debug-overrides>
</network-security-config>
`;

function withSSLPinning(config) {
  return withAndroidManifest(config, async (modConfig) => {
    const mainApplication =
      AndroidConfig.Manifest.getMainApplicationOrThrow(modConfig.modResults);

    // Write network_security_config.xml into android/app/src/main/res/xml/
    const xmlDir = resolve(
      modConfig.modRequest.platformProjectRoot,
      "app/src/main/res/xml",
    );
    if (!existsSync(xmlDir)) {
      mkdirSync(xmlDir, { recursive: true });
    }
    writeFileSync(
      resolve(xmlDir, "network_security_config.xml"),
      NETWORK_SECURITY_CONFIG_XML,
    );

    // Point AndroidManifest.xml <application> at the config
    mainApplication.$["android:networkSecurityConfig"] =
      "@xml/network_security_config";

    return modConfig;
  });
}

module.exports = withSSLPinning;
