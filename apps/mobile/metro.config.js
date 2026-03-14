const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.join(projectRoot, "node_modules"),
  path.join(workspaceRoot, "node_modules"),
];
config.resolver.disableHierarchicalLookup = true;
config.resolver.extraNodeModules = {
  react: path.join(workspaceRoot, "node_modules/react"),
  "react-native": path.join(workspaceRoot, "node_modules/react-native"),
  "@react-navigation/native": path.join(workspaceRoot, "node_modules/@react-navigation/native"),
  "@react-navigation/native-stack": path.join(workspaceRoot, "node_modules/@react-navigation/native-stack"),
  "@react-navigation/bottom-tabs": path.join(workspaceRoot, "node_modules/@react-navigation/bottom-tabs"),
  "react-native-safe-area-context": path.join(workspaceRoot, "node_modules/react-native-safe-area-context"),
};

module.exports = withNativeWind(config, { input: "./app/global.css" });
