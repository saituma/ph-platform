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
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.join(projectRoot, "node_modules"),
  path.join(workspaceRoot, "node_modules"),
];
config.resolver.alias = {
  ...(config.resolver.alias || {}),
  "@": projectRoot,
};
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  "@": projectRoot,
};
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith("@/")) {
    const absolutePath = path.join(projectRoot, moduleName.slice(2));
    if (defaultResolveRequest) {
      return defaultResolveRequest(context, absolutePath, platform);
    }
    return context.resolveRequest(context, absolutePath, platform);
  }
  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};
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
