const path = require("path");
const fs = require("fs");
const { getDefaultConfig } = require("expo/metro-config");
const { withUniwindConfig } = require("uniwind/metro");
const {
  wrapWithReanimatedMetroConfig,
} = require("react-native-reanimated/metro-config");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

if (!process.env.EXPO_ROUTER_APP_ROOT) {
  process.env.EXPO_ROUTER_APP_ROOT = path.join(projectRoot, "app");
}

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.join(projectRoot, "node_modules"),
  path.join(workspaceRoot, "node_modules"),
];
config.resolver.disableHierarchicalLookup = true;

const workspaceNodeModules = path.join(workspaceRoot, "node_modules");
config.resolver.extraNodeModules = new Proxy(
  {},
  {
    get: (_target, name) => {
      const localPath = path.join(projectRoot, "node_modules", String(name));
      if (fs.existsSync(localPath)) return localPath;
      return path.join(workspaceNodeModules, String(name));
    },
  },
);

module.exports = withUniwindConfig(
  wrapWithReanimatedMetroConfig(config),
  {
    cssEntryFile: "./app/global.css",
    dtsFile: "./src/uniwind.d.ts",
  },
);
