import Feather from "@expo/vector-icons/Feather";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { cssInterop } from "nativewind";

function interopIcon(IconSet: any, name: string) {
  if (!IconSet) {
    console.warn(`Icon set ${name} is undefined`);
    return;
  }

  try {
    const Component = IconSet;
    if (!Component.displayName) {
      Component.displayName = name;
    }

    cssInterop(Component, {
      nativeStyleToProp: {
        color: true,
      },
    });
  } catch (e) {
    console.warn(`Could not apply cssInterop to ${name}:`, e);
  }
}

interopIcon(Feather, "Feather");
interopIcon(MaterialIcons, "MaterialIcons");
interopIcon(Ionicons, "Ionicons");
interopIcon(FontAwesome, "FontAwesome");
interopIcon(MaterialCommunityIcons, "MaterialCommunityIcons");

export {
  Feather,
  FontAwesome,
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons
};

