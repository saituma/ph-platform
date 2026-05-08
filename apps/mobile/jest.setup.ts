jest.mock("@react-native-async-storage/async-storage", () => {
  const mock = {
    getItem: jest.fn(async () => null),
    setItem: jest.fn(async () => undefined),
    removeItem: jest.fn(async () => undefined),
  };

  return {
    __esModule: true,
    default: mock,
    ...mock,
  };
});

jest.mock("expo-secure-store", () => {
  const mock = {
    getItemAsync: jest.fn(),
    setItemAsync: jest.fn(),
    deleteItemAsync: jest.fn(async () => undefined),
  };

  return {
    __esModule: true,
    default: mock,
    ...mock,
  };
});

jest.mock("react-native-css-interop", () => ({}), { virtual: true });

jest.mock("expo-constants", () => ({
  __esModule: true,
  default: {
    expoConfig: {
      extra: {},
    },
  },
  ExecutionEnvironment: { Standalone: "standalone", StoreClient: "storeClient", Bare: "bare" },
}));

jest.mock("@sentry/react-native", () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  setUser: jest.fn(),
  setTag: jest.fn(),
  addBreadcrumb: jest.fn(),
  withScope: jest.fn((cb: any) => cb({ setTag: jest.fn(), setExtra: jest.fn() })),
  Severity: { Error: "error", Warning: "warning", Info: "info" },
  wrap: (component: any) => component,
  ReactNavigationInstrumentation: jest.fn(),
  ReactNativeTracing: jest.fn(),
}));

jest.mock("expo-sqlite", () => ({
  openDatabaseAsync: jest.fn().mockResolvedValue({
    execAsync: jest.fn(),
    getAllAsync: jest.fn().mockResolvedValue([]),
    runAsync: jest.fn(),
    getFirstAsync: jest.fn().mockResolvedValue(null),
  }),
  openDatabaseSync: jest.fn().mockReturnValue({
    execSync: jest.fn(),
    getAllSync: jest.fn().mockReturnValue([]),
    runSync: jest.fn(),
  }),
}), { virtual: true });

jest.mock("expo-task-manager", () => ({
  defineTask: jest.fn(),
  isTaskRegisteredAsync: jest.fn().mockResolvedValue(false),
  unregisterTaskAsync: jest.fn().mockResolvedValue(undefined),
}), { virtual: true });

jest.mock("expo-location", () => ({
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
  requestBackgroundPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
  getCurrentPositionAsync: jest.fn().mockResolvedValue({ coords: { latitude: 0, longitude: 0 } }),
  startLocationUpdatesAsync: jest.fn(),
  stopLocationUpdatesAsync: jest.fn(),
  Accuracy: { Highest: 6, High: 5, Balanced: 4, Low: 3, Lowest: 2, BestForNavigation: 1 },
  ActivityType: { Fitness: 3 },
}), { virtual: true });

jest.mock("expo-notifications", () => ({
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
  scheduleNotificationAsync: jest.fn().mockResolvedValue("notif-id"),
  cancelScheduledNotificationAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
  addNotificationReceivedListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  addNotificationResponseReceivedListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  getExpoPushTokenAsync: jest.fn().mockResolvedValue({ data: "expo-push-token" }),
  setNotificationChannelAsync: jest.fn(),
  AndroidImportance: { MAX: 5, HIGH: 4, DEFAULT: 3 },
  SchedulableTriggerInputTypes: { DAILY: "daily", CALENDAR: "calendar" },
}), { virtual: true });

jest.mock("expo-file-system/legacy", () => ({
  documentDirectory: "/mock/docs/",
  cacheDirectory: "/mock/cache/",
  getInfoAsync: jest.fn().mockResolvedValue({ exists: false, size: 0 }),
  downloadAsync: jest.fn().mockResolvedValue({ uri: "/mock/downloaded" }),
  readAsStringAsync: jest.fn().mockResolvedValue(""),
  writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
  deleteAsync: jest.fn().mockResolvedValue(undefined),
  makeDirectoryAsync: jest.fn().mockResolvedValue(undefined),
}), { virtual: true });

jest.mock("expo-image-picker", () => ({
  launchImageLibraryAsync: jest.fn().mockResolvedValue({ canceled: true, assets: [] }),
  launchCameraAsync: jest.fn().mockResolvedValue({ canceled: true, assets: [] }),
  MediaTypeOptions: { Images: "Images", Videos: "Videos", All: "All" },
  VideoExportPreset: { Passthrough: 0, LowQuality: 1, MediumQuality: 2, HighestQuality: 3 },
  UIImagePickerPreferredAssetRepresentationMode: { Automatic: 0, Current: 1, Compatible: 2 },
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
  requestCameraPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
}), { virtual: true });

jest.mock("expo-video", () => ({
  useVideoPlayer: jest.fn().mockReturnValue({
    play: jest.fn(),
    pause: jest.fn(),
    seekBy: jest.fn(),
    currentTime: 0,
    duration: 0,
    status: "idle",
  }),
  VideoView: "VideoView",
}), { virtual: true });

jest.mock("expo-speech", () => ({
  speak: jest.fn(),
  stop: jest.fn(),
  isSpeakingAsync: jest.fn().mockResolvedValue(false),
}), { virtual: true });

jest.mock("react-native-mmkv", () => ({
  MMKV: jest.fn().mockImplementation(() => ({
    getString: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    contains: jest.fn().mockReturnValue(false),
    getAllKeys: jest.fn().mockReturnValue([]),
  })),
}), { virtual: true });

jest.mock("socket.io-client", () => ({
  io: jest.fn().mockReturnValue({
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
    connected: false,
  }),
}), { virtual: true });

jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: "light", Medium: "medium", Heavy: "heavy" },
  NotificationFeedbackType: { Success: "success", Warning: "warning", Error: "error" },
}), { virtual: true });

jest.mock("expo-battery", () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(false),
  getBatteryLevelAsync: jest.fn().mockResolvedValue(1),
  isBatteryOptimizationEnabledAsync: jest.fn().mockResolvedValue(false),
}), { virtual: true });

jest.mock("expo-crypto", () => ({
  randomUUID: jest.fn().mockReturnValue("mock-uuid-1234"),
  digestStringAsync: jest.fn().mockResolvedValue("mock-hash"),
  CryptoDigestAlgorithm: { SHA256: "SHA-256" },
}), { virtual: true });

jest.mock("expo-av", () => ({
  Audio: {
    Recording: jest.fn(),
    Sound: { createAsync: jest.fn() },
    setAudioModeAsync: jest.fn(),
    requestPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
  },
}), { virtual: true });

jest.mock("expo-image", () => ({
  Image: {
    prefetch: jest.fn(),
    clearMemoryCache: jest.fn(),
    clearDiskCache: jest.fn(),
  },
}), { virtual: true });

jest.mock("react-native-reanimated", () => {
  const View = require("react-native").View;
  return {
    __esModule: true,
    default: {
      call: jest.fn(),
      createAnimatedComponent: (c: any) => c || View,
      View,
      Text: View,
      Image: View,
      ScrollView: View,
      FlatList: View,
    },
    useSharedValue: jest.fn((v: any) => ({ value: v })),
    useAnimatedStyle: jest.fn(() => ({})),
    useAnimatedProps: jest.fn(() => ({})),
    useDerivedValue: jest.fn((fn: any) => ({ value: fn() })),
    useAnimatedRef: jest.fn(() => ({ current: null })),
    useAnimatedScrollHandler: jest.fn(() => jest.fn()),
    withTiming: jest.fn((v: any) => v),
    withSpring: jest.fn((v: any) => v),
    withDelay: jest.fn((_: any, v: any) => v),
    withSequence: jest.fn((...args: any[]) => args[args.length - 1]),
    withRepeat: jest.fn((v: any) => v),
    cancelAnimation: jest.fn(),
    runOnJS: jest.fn((fn: any) => fn),
    runOnUI: jest.fn((fn: any) => fn),
    interpolate: jest.fn(),
    Extrapolation: { CLAMP: "clamp", EXTEND: "extend" },
    Easing: { linear: jest.fn(), ease: jest.fn(), bezier: jest.fn().mockReturnValue(jest.fn()), in: jest.fn(), out: jest.fn(), inOut: jest.fn() },
    FadeIn: { duration: jest.fn().mockReturnThis(), delay: jest.fn().mockReturnThis() },
    FadeOut: { duration: jest.fn().mockReturnThis(), delay: jest.fn().mockReturnThis() },
    FadeInDown: { duration: jest.fn().mockReturnThis(), delay: jest.fn().mockReturnThis() },
    FadeOutDown: { duration: jest.fn().mockReturnThis(), delay: jest.fn().mockReturnThis() },
    SlideInRight: { duration: jest.fn().mockReturnThis() },
    SlideOutRight: { duration: jest.fn().mockReturnThis() },
    SlideInDown: { duration: jest.fn().mockReturnThis() },
    SlideOutDown: { duration: jest.fn().mockReturnThis() },
    Layout: { duration: jest.fn().mockReturnThis(), springify: jest.fn().mockReturnThis() },
    LinearTransition: { duration: jest.fn().mockReturnThis().springify?.() || jest.fn().mockReturnThis() },
    ZoomIn: { duration: jest.fn().mockReturnThis() },
    ZoomOut: { duration: jest.fn().mockReturnThis() },
    clamp: jest.fn((v: any) => v),
    createAnimatedComponent: (c: any) => c || View,
    Keyframe: jest.fn().mockImplementation(() => ({ duration: jest.fn().mockReturnThis() })),
  };
});

jest.mock("react-native-worklets", () => ({
  createWorklet: jest.fn(),
  useWorklet: jest.fn(),
}), { virtual: true });

jest.mock("react-native-gesture-handler", () => {
  const View = require("react-native").View;
  return {
    Swipeable: View,
    DrawerLayout: View,
    State: {},
    ScrollView: View,
    Slider: View,
    Switch: View,
    TextInput: View,
    ToolbarAndroid: View,
    ViewPagerAndroid: View,
    DrawerLayoutAndroid: View,
    WebView: View,
    NativeViewGestureHandler: View,
    TapGestureHandler: View,
    FlingGestureHandler: View,
    ForceTouchGestureHandler: View,
    LongPressGestureHandler: View,
    PanGestureHandler: View,
    PinchGestureHandler: View,
    RotationGestureHandler: View,
    RawButton: View,
    BaseButton: View,
    RectButton: View,
    BorderlessButton: View,
    FlatList: View,
    gestureHandlerRootHOC: jest.fn((c: any) => c),
    Directions: {},
    GestureDetector: View,
    Gesture: {
      Pan: jest.fn().mockReturnValue({ onStart: jest.fn().mockReturnThis(), onUpdate: jest.fn().mockReturnThis(), onEnd: jest.fn().mockReturnThis() }),
      Tap: jest.fn().mockReturnValue({ onStart: jest.fn().mockReturnThis(), onEnd: jest.fn().mockReturnThis() }),
    },
  };
});

jest.mock("heroui-native", () => {
  const View = require("react-native").View;
  return new Proxy({}, {
    get: (_target, prop) => {
      if (prop === "__esModule") return true;
      if (prop === "cn") return (...args: any[]) => args.filter(Boolean).join(" ");
      return View;
    },
  });
});

jest.mock("@expo/vector-icons", () => new Proxy({}, { get: () => "Icon" }), { virtual: true });
jest.mock("@expo/vector-icons/AntDesign", () => "AntDesign", { virtual: true });
jest.mock("@expo/vector-icons/Ionicons", () => "Ionicons", { virtual: true });
jest.mock("@expo/vector-icons/MaterialIcons", () => "MaterialIcons", { virtual: true });
jest.mock("@expo/vector-icons/Feather", () => "Feather", { virtual: true });
jest.mock("@expo/vector-icons/FontAwesome", () => "FontAwesome", { virtual: true });
jest.mock("@expo/vector-icons/MaterialCommunityIcons", () => "MaterialCommunityIcons", { virtual: true });
