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

// watchFolders is the workspace root, so Metro's file-map crawls EVERYTHING under it — including
// .pnpm-store (6 GB / 134k files) and .turbo (2.1 GB), neither of which contains app source.
// metro-file-map gives up after a hardcoded 240s ("Failed to start watch mode"), which is exactly
// what `expo start` was dying with. These paths are already gitignored build/cache artefacts.
const escapedRoot = workspaceRoot.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
config.resolver.blockList = [
  new RegExp(`^${escapedRoot}/\\.pnpm-store/.*`),
  new RegExp(`^${escapedRoot}/\\.turbo/.*`),
  new RegExp(`^${escapedRoot}/\\.git/.*`),
  new RegExp(`^${escapedRoot}/apps/(api|web|onboarding|docs|superadmin|worker|showcase|parent)/.*`),
  new RegExp(`^${escapedRoot}/android/.*`),
  new RegExp(`^${escapedRoot}/qa-audit-results/.*`),
];
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
