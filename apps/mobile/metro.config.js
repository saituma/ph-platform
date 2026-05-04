const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withUniwindConfig } = require("uniwind/metro");
const {
  wrapWithReanimatedMetroConfig,
} = require("react-native-reanimated/metro-config");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

process.env.EXPO_ROUTER_APP_ROOT = path.join(projectRoot, "app");

const config = getDefaultConfig(projectRoot);

config.projectRoot = workspaceRoot;
config.watchFolders = [projectRoot];
config.resolver.nodeModulesPaths = [
  path.join(projectRoot, "node_modules"),
  path.join(workspaceRoot, "node_modules"),
];
config.resolver.disableHierarchicalLookup = true;
config.resolver.sourceExts = [...(config.resolver.sourceExts || [])];
config.serializer.getModulesRunBeforeMainModule = () => [
  require.resolve("react-native/Libraries/Core/InitializeCore"),
];

module.exports = withUniwindConfig(
  wrapWithReanimatedMetroConfig(config),
  {
    cssEntryFile: path.join(projectRoot, "app/global.css"),
    dtsFile: path.join(projectRoot, "src/uniwind.d.ts"),
  },
);
