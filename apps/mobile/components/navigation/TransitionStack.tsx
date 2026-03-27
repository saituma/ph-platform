import { withLayoutContext } from "expo-router";
import {
  createBlankStackNavigator,
  type BlankStackNavigationOptions,
} from "react-native-screen-transitions/blank-stack";
import Transition from "react-native-screen-transitions";
import { interpolate } from "react-native-reanimated";
import Constants from "expo-constants";
import { View } from "react-native";

const { Navigator } = createBlankStackNavigator();

export const Stack = withLayoutContext(Navigator as any);

export { Transition };

const isExpoGo = Constants.executionEnvironment === "storeClient";

export function SafeMaskedView({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: any;
}) {
  if (isExpoGo) {
    return <View style={style}>{children}</View>;
  }
  return <Transition.MaskedView style={style}>{children}</Transition.MaskedView>;
}

export const slideFromRight = {
  screenStyleInterpolator: ({ progress, layouts: { screen } }: any) => {
    "worklet";
    return {
      contentStyle: {
        transform: [
          {
            translateX: interpolate(
              progress,
              [0, 1, 2],
              [screen.width, 0, -screen.width * 0.3]
            ),
          },
        ],
      },
    };
  },
};
