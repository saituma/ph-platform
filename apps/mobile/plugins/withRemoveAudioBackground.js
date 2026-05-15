const { withInfoPlist } = require("expo/config-plugins");

/**
 * expo-video injects "audio" into UIBackgroundModes automatically.
 * This app does not play audio in the background, so we strip it out
 * to satisfy App Store guideline 2.5.4.
 */
module.exports = function withRemoveAudioBackground(config) {
  return withInfoPlist(config, (c) => {
    const modes = c.modResults.UIBackgroundModes;
    if (Array.isArray(modes)) {
      c.modResults.UIBackgroundModes = modes.filter((m) => m !== "audio");
    }
    return c;
  });
};
