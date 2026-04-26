import { useFonts } from "expo-font";
import { Platform } from "react-native";

export default function useLoadFonts(): boolean {
  const [loaded] = useFonts({
    // Chillax
    "Chillax-Extralight": require("../../assets/fonts/Chillax-Extralight.ttf"),
    "Chillax-Light": require("../../assets/fonts/Chillax-Light.ttf"),
    Chillax: require("../../assets/fonts/Chillax-Regular.ttf"),
    "Chillax-Medium": require("../../assets/fonts/Chillax-Medium.ttf"),
    "Chillax-Semibold": require("../../assets/fonts/Chillax-Semibold.ttf"),
    "Chillax-Bold": require("../../assets/fonts/Chillax-Bold.ttf"),

    // Outfit
    "Outfit-Thin": require("../../assets/fonts/Outfit-Thin.ttf"),
    "Outfit-ExtraLight": require("../../assets/fonts/Outfit-ExtraLight.ttf"),
    "Outfit-Light": require("../../assets/fonts/Outfit-Light.ttf"),
    Outfit: require("../../assets/fonts/Outfit-Regular.ttf"),
    "Outfit-Medium": require("../../assets/fonts/Outfit-Medium.ttf"),
    "Outfit-SemiBold": require("../../assets/fonts/Outfit-SemiBold.ttf"),
    "Outfit-Bold": require("../../assets/fonts/Outfit-Bold.ttf"),
    "Outfit-ExtraBold": require("../../assets/fonts/Outfit-ExtraBold.ttf"),
    "Outfit-Black": require("../../assets/fonts/Outfit-Black.ttf"),
  });

  if (Platform.OS === "web") return true;

  return loaded;
}