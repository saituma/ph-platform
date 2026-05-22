import "react-native";

declare module "react-native" {
  // isPad exists on PlatformIOSStatic but not on the base PlatformStatic union,
  // causing TS2339 when accessing Platform.isPad on non-iOS builds.
  interface PlatformStatic {
    isPad: boolean;
  }
}
