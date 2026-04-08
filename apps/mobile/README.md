# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## UI Motion Stack

The mobile app uses this interaction and animation stack:

- [react-native-keyboard-controller](https://github.com/kirillzyusko/react-native-keyboard-controller)
- [@gorhom/bottom-sheet](https://gorhom.dev/react-native-bottom-sheet/)
- [react-native-gesture-handler docs](https://docs.swmansion.com/react-native-gesture-handler/)
- [react-native-reanimated docs](https://docs.swmansion.com/react-native-reanimated/)
- [Software Mansion products](https://swmansion.com/products)
- [react-native-reanimated GitHub](https://github.com/software-mansion/react-native-reanimated)
- [Expo BlurView docs](https://docs.expo.dev/versions/latest/sdk/blur-view/)

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Maps (react-native-maps)

This app uses `react-native-maps`. On **Android**, Google Maps requires an API key.

- Set `GOOGLE_MAPS_API_KEY` (or `ANDROID_GOOGLE_MAPS_API_KEY`) in your environment/EAS build env (it’s read by Gradle).
- Rebuild the native app after setting it (dev client / `expo run:android`).

If Android build fails with `Unsupported class file major version 70`, you’re likely running Java 26. Switch to a supported JDK (JDK 17 is the safest default for Android builds) and retry.

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
