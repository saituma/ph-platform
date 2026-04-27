import React from "react";
import { Platform, View, type StyleProp, type ViewStyle } from "react-native";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import {
  ArrowLeft,
  ArrowUpDown,
  BarChart3,
  GraduationCap,
  CalendarDays,
  ChevronRight,
  CirclePlus,
  Ellipsis,
  Heart,
  House,
  Image as ImageIcon,
  Menu,
  MessageCircle,
  MessageCircleMore,
  Play,
  RefreshCw,
  Route,
  Send,
  Settings2,
  UserRound,
  type LucideIcon,
} from "lucide-react-native";

export type AppIconName =
  | "add-circle"
  | "arrow-back"
  | "calendar"
  | "chat"
  | "chat-detail"
  | "chevron-right"
  | "home"
  | "home-filled"
  | "image"
  | "menu"
  | "more"
  | "parents"
  | "play"
  | "programs"
  | "refresh"
  | "schedule"
  | "settings"
  | "share"
  | "sort"
  | "stats"
  | "tracking"
  | "user"
  | "heart"
  | "heart-filled";

type AppIconProps = {
  name: AppIconName;
  size?: number;
  color: string;
  filled?: boolean;
  strokeWidth?: number;
  style?: StyleProp<ViewStyle>;
};

const IOS_SYMBOLS: Record<AppIconName, SymbolViewProps["name"]> = {
  "add-circle": "plus.circle.fill",
  "arrow-back": "arrow.left",
  calendar: "calendar",
  chat: "bubble.right",
  "chat-detail": "bubble.left.and.bubble.right",
  "chevron-right": "chevron.right",
  heart: "heart",
  "heart-filled": "heart.fill",
  home: "house",
  "home-filled": "house.fill",
  image: "photo",
  menu: "line.3.horizontal",
  more: "ellipsis",
  parents: "graduationcap",
  play: "play.fill",
  programs: "figure.strengthtraining.traditional",
  refresh: "arrow.clockwise",
  schedule: "calendar",
  settings: "gearshape",
  share: "square.and.arrow.up",
  sort: "arrow.up.arrow.down",
  stats: "chart.bar",
  tracking: "figure.run",
  user: "person.crop.circle",
};

const ANDROID_ICONS: Record<AppIconName, LucideIcon> = {
  "add-circle": CirclePlus,
  "arrow-back": ArrowLeft,
  calendar: CalendarDays,
  chat: MessageCircle,
  "chat-detail": MessageCircleMore,
  "chevron-right": ChevronRight,
  heart: Heart,
  "heart-filled": Heart,
  home: House,
  "home-filled": House,
  image: ImageIcon,
  menu: Menu,
  more: Ellipsis,
  parents: GraduationCap,
  play: Play,
  programs: BarChart3,
  refresh: RefreshCw,
  schedule: CalendarDays,
  settings: Settings2,
  share: Send,
  sort: ArrowUpDown,
  stats: BarChart3,
  tracking: Route,
  user: UserRound,
};

export function AppIcon({
  name,
  size = 22,
  color,
  filled = false,
  strokeWidth = 2,
  style,
}: AppIconProps) {
  const resolvedName =
    filled && name === "home"
      ? "home-filled"
      : filled && name === "heart"
        ? "heart-filled"
        : name;

  if (Platform.OS === "ios") {
    return (
      <SymbolView
        name={IOS_SYMBOLS[resolvedName]}
        tintColor={color}
        resizeMode="scaleAspectFit"
        style={[
          {
            width: size,
            height: size,
          },
          style,
        ]}
      />
    );
  }

  const Icon = ANDROID_ICONS[resolvedName];
  const isFilledHeart = resolvedName === "heart-filled";

  return (
    <View style={style}>
      <Icon
        size={size}
        color={color}
        strokeWidth={strokeWidth}
        fill={isFilledHeart ? color : "none"}
      />
    </View>
  );
}
