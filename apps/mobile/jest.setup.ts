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
  };

  return {
    __esModule: true,
    default: mock,
    ...mock,
  };
});

jest.mock("react-native-css-interop", () => ({}));
