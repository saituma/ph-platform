import { useFonts } from "expo-font";
import { Platform } from "react-native";

export default function useLoadFonts(): boolean {
  if (Platform.OS === "web") return true;

  const [loaded] = useFonts({
    // Britney
    "Britney-Light": require("../../assets/fonts/Britney-Light.ttf"),
    Britney: require("../../assets/fonts/Britney-Regular.ttf"),
    "Britney-Bold": require("../../assets/fonts/Britney-Bold.ttf"),
    "Britney-Ultra": require("../../assets/fonts/Britney-Ultra.ttf"),

    // CabinetGrotesk
    "CabinetGrotesk-Thin": require("../../assets/fonts/CabinetGrotesk-Thin.ttf"),
    "CabinetGrotesk-Extralight": require("../../assets/fonts/CabinetGrotesk-Extralight.ttf"),
    "CabinetGrotesk-Light": require("../../assets/fonts/CabinetGrotesk-Light.ttf"),
    CabinetGrotesk: require("../../assets/fonts/CabinetGrotesk-Regular.ttf"),
    "CabinetGrotesk-Medium": require("../../assets/fonts/CabinetGrotesk-Medium.ttf"),
    "CabinetGrotesk-Bold": require("../../assets/fonts/CabinetGrotesk-Bold.ttf"),
    "CabinetGrotesk-Extrabold": require("../../assets/fonts/CabinetGrotesk-Extrabold.ttf"),
    "CabinetGrotesk-Black": require("../../assets/fonts/CabinetGrotesk-Black.ttf"),

    // Chillax
    "Chillax-Extralight": require("../../assets/fonts/Chillax-Extralight.ttf"),
    "Chillax-Light": require("../../assets/fonts/Chillax-Light.ttf"),
    Chillax: require("../../assets/fonts/Chillax-Regular.ttf"),
    "Chillax-Medium": require("../../assets/fonts/Chillax-Medium.ttf"),
    "Chillax-Semibold": require("../../assets/fonts/Chillax-Semibold.ttf"),
    "Chillax-Bold": require("../../assets/fonts/Chillax-Bold.ttf"),

    // ClashDisplay
    "ClashDisplay-Extralight": require("../../assets/fonts/ClashDisplay-Extralight.ttf"),
    "ClashDisplay-Light": require("../../assets/fonts/ClashDisplay-Light.ttf"),
    ClashDisplay: require("../../assets/fonts/ClashDisplay-Regular.ttf"),
    "ClashDisplay-Medium": require("../../assets/fonts/ClashDisplay-Medium.ttf"),
    "ClashDisplay-Semibold": require("../../assets/fonts/ClashDisplay-Semibold.ttf"),
    "ClashDisplay-Bold": require("../../assets/fonts/ClashDisplay-Bold.ttf"),

    // Melodrama
    "Melodrama-Light": require("../../assets/fonts/Melodrama-Light.ttf"),
    Melodrama: require("../../assets/fonts/Melodrama-Regular.ttf"),
    "Melodrama-Medium": require("../../assets/fonts/Melodrama-Medium.ttf"),
    "Melodrama-Semibold": require("../../assets/fonts/Melodrama-Semibold.ttf"),
    "Melodrama-Bold": require("../../assets/fonts/Melodrama-Bold.ttf"),

    // Nippo
    "Nippo-Extralight": require("../../assets/fonts/Nippo-Extralight.ttf"),
    "Nippo-Light": require("../../assets/fonts/Nippo-Light.ttf"),
    Nippo: require("../../assets/fonts/Nippo-Regular.ttf"),
    "Nippo-Medium": require("../../assets/fonts/Nippo-Medium.ttf"),
    "Nippo-Bold": require("../../assets/fonts/Nippo-Bold.ttf"),

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

    // Panchang
    "Panchang-Extralight": require("../../assets/fonts/Panchang-Extralight.ttf"),
    "Panchang-Light": require("../../assets/fonts/Panchang-Light.ttf"),
    Panchang: require("../../assets/fonts/Panchang-Regular.ttf"),
    "Panchang-Medium": require("../../assets/fonts/Panchang-Medium.ttf"),
    "Panchang-Semibold": require("../../assets/fonts/Panchang-Semibold.ttf"),
    "Panchang-Bold": require("../../assets/fonts/Panchang-Bold.ttf"),
    "Panchang-Extrabold": require("../../assets/fonts/Panchang-Extrabold.ttf"),

    // Poppins
    "Poppins-Thin": require("../../assets/fonts/Poppins-Thin.ttf"),
    "Poppins-ExtraLight": require("../../assets/fonts/Poppins-ExtraLight.ttf"),
    "Poppins-Light": require("../../assets/fonts/Poppins-Light.ttf"),
    Poppins: require("../../assets/fonts/Poppins-Regular.ttf"),
    "Poppins-Medium": require("../../assets/fonts/Poppins-Medium.ttf"),
    "Poppins-SemiBold": require("../../assets/fonts/Poppins-SemiBold.ttf"),
    "Poppins-Bold": require("../../assets/fonts/Poppins-Bold.ttf"),
    "Poppins-ExtraBold": require("../../assets/fonts/Poppins-ExtraBold.ttf"),
    "Poppins-Black": require("../../assets/fonts/Poppins-Black.ttf"),
    // Poppins Italics
    "Poppins-ThinItalic": require("../../assets/fonts/Poppins-ThinItalic.ttf"),
    "Poppins-ExtraLightItalic": require("../../assets/fonts/Poppins-ExtraLightItalic.ttf"),
    "Poppins-LightItalic": require("../../assets/fonts/Poppins-LightItalic.ttf"),
    "Poppins-Italic": require("../../assets/fonts/Poppins-Italic.ttf"),
    "Poppins-MediumItalic": require("../../assets/fonts/Poppins-MediumItalic.ttf"),
    "Poppins-SemiBoldItalic": require("../../assets/fonts/Poppins-SemiBoldItalic.ttf"),
    "Poppins-BoldItalic": require("../../assets/fonts/Poppins-BoldItalic.ttf"),
    "Poppins-ExtraBoldItalic": require("../../assets/fonts/Poppins-ExtraBoldItalic.ttf"),
    "Poppins-BlackItalic": require("../../assets/fonts/Poppins-BlackItalic.ttf"),

    // Satoshi
    "Satoshi-Light": require("../../assets/fonts/Satoshi-Light.ttf"),
    Satoshi: require("../../assets/fonts/Satoshi-Regular.ttf"),
    "Satoshi-Medium": require("../../assets/fonts/Satoshi-Medium.ttf"),
    "Satoshi-Bold": require("../../assets/fonts/Satoshi-Bold.ttf"),
    "Satoshi-Black": require("../../assets/fonts/Satoshi-Black.ttf"),
    "Satoshi-LightItalic": require("../../assets/fonts/Satoshi-LightItalic.ttf"),
    "Satoshi-Italic": require("../../assets/fonts/Satoshi-Italic.ttf"),
    "Satoshi-MediumItalic": require("../../assets/fonts/Satoshi-MediumItalic.ttf"),
    "Satoshi-BoldItalic": require("../../assets/fonts/Satoshi-BoldItalic.ttf"),
    "Satoshi-BlackItalic": require("../../assets/fonts/Satoshi-BlackItalic.ttf"),

    // Sentient
    "Sentient-Extralight": require("../../assets/fonts/Sentient-Extralight.ttf"),
    "Sentient-Light": require("../../assets/fonts/Sentient-Light.ttf"),
    Sentient: require("../../assets/fonts/Sentient-Regular.ttf"),
    "Sentient-Medium": require("../../assets/fonts/Sentient-Medium.ttf"),
    "Sentient-Bold": require("../../assets/fonts/Sentient-Bold.ttf"),
    "Sentient-ExtralightItalic": require("../../assets/fonts/Sentient-ExtralightItalic.ttf"),
    "Sentient-LightItalic": require("../../assets/fonts/Sentient-LightItalic.ttf"),
    "Sentient-Italic": require("../../assets/fonts/Sentient-Italic.ttf"),
    "Sentient-MediumItalic": require("../../assets/fonts/Sentient-MediumItalic.ttf"),
    "Sentient-BoldItalic": require("../../assets/fonts/Sentient-BoldItalic.ttf"),

    // Supreme
    "Supreme-Thin": require("../../assets/fonts/Supreme-Thin.ttf"),
    "Supreme-Extralight": require("../../assets/fonts/Supreme-Extralight.ttf"),
    "Supreme-Light": require("../../assets/fonts/Supreme-Light.ttf"),
    Supreme: require("../../assets/fonts/Supreme-Regular.ttf"),
    "Supreme-Medium": require("../../assets/fonts/Supreme-Medium.ttf"),
    "Supreme-Bold": require("../../assets/fonts/Supreme-Bold.ttf"),
    "Supreme-Extrabold": require("../../assets/fonts/Supreme-Extrabold.ttf"),
    "Supreme-ThinItalic": require("../../assets/fonts/Supreme-ThinItalic.ttf"),
    "Supreme-ExtralightItalic": require("../../assets/fonts/Supreme-ExtralightItalic.ttf"),
    "Supreme-LightItalic": require("../../assets/fonts/Supreme-LightItalic.ttf"),
    "Supreme-Italic": require("../../assets/fonts/Supreme-Italic.ttf"),
    "Supreme-MediumItalic": require("../../assets/fonts/Supreme-MediumItalic.ttf"),
    "Supreme-BoldItalic": require("../../assets/fonts/Supreme-BoldItalic.ttf"),
    "Supreme-ExtraboldItalic": require("../../assets/fonts/Supreme-ExtraboldItalic.ttf"),

    // Technor
    "Technor-Extralight": require("../../assets/fonts/Technor-Extralight.ttf"),
    "Technor-Light": require("../../assets/fonts/Technor-Light.ttf"),
    Technor: require("../../assets/fonts/Technor-Regular.ttf"),
    "Technor-Medium": require("../../assets/fonts/Technor-Medium.ttf"),
    "Technor-Semibold": require("../../assets/fonts/Technor-Semibold.ttf"),
    "Technor-Bold": require("../../assets/fonts/Technor-Bold.ttf"),
    "Technor-Black": require("../../assets/fonts/Technor-Black.ttf"),

    // Teko
    "Teko-Light": require("../../assets/fonts/Teko-Light.ttf"),
    Teko: require("../../assets/fonts/Teko-Regular.ttf"),
    "Teko-Medium": require("../../assets/fonts/Teko-Medium.ttf"),
    "Teko-SemiBold": require("../../assets/fonts/Teko-SemiBold.ttf"),
    "Teko-Bold": require("../../assets/fonts/Teko-Bold.ttf"),

    // Telma
    "Telma-Light": require("../../assets/fonts/Telma-Light.ttf"),
    Telma: require("../../assets/fonts/Telma-Regular.ttf"),
    "Telma-Medium": require("../../assets/fonts/Telma-Medium.ttf"),
    "Telma-Bold": require("../../assets/fonts/Telma-Bold.ttf"),
    "Telma-Black": require("../../assets/fonts/Telma-Black.ttf"),
  });

  return loaded;
}
