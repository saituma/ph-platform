import React, { useEffect, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import type { ChatMessage } from "@/constants/messages";
import { tokens } from "@/src/theme/tokens";
import { AudioBubble } from "@/src/components/messaging/AudioBubble";
import { Avatar } from "@/src/components/messaging/Avatar";
import { DeliveryStatus } from "@/src/components/messaging/DeliveryStatus";
import { DocumentBubble } from "@/src/components/messaging/DocumentBubble";
import { ImageBubble } from "@/src/components/messaging/ImageBubble";
import { VideoBubble } from "@/src/components/messaging/VideoBubble";

const DEFAULT_BLURHASH = "L6PZfSi_.AyE_3t7t7R**0o#DgR4";
const TAIL_SIZE = tokens.spacing.sm - tokens.spacing.xs / 2;
const AVATAR_SIZE = tokens.spacing.xl + tokens.spacing.xs;
const ENTRANCE_OPACITY_DURATION = tokens.timing.normal;

export type MessageType = ChatMessage & {
  type?: "text" | "image" | "video" | "audio" | "document";
  mediaUri?: string;
  thumbnailUri?: string;
  mimeType?: string;
  fileSize?: number;
  duration?: number;
  blurhash?: string;
  status?: "sending" | "sent" | "delivered" | "read";
};

export interface MessageBubbleProps {
  message: MessageType;
  isOwn: boolean;
  showAvatar: boolean;
  isGrouped: boolean;
  onLongPress: () => void;
}

type BubbleKind = "text" | "image" | "video" | "audio" | "document";

const determineBubbleKind = (message: MessageType): BubbleKind => {
  if (message.type) return message.type;
  if (message.contentType === "image") return "image";
  if (message.contentType === "video") return "video";

  const mimeLower = String(message.mimeType ?? "").toLowerCase();
  if (mimeLower.startsWith("audio/")) return "audio";
  if (mimeLower.includes("pdf")) return "document";
  if (mimeLower.includes("zip") || mimeLower.includes("rar") || mimeLower.includes("sheet")) {
    return "document";
  }
  return "text";
};

const mapDeliveryStatus = (status?: MessageType["status"]): "sending" | "sent" | "delivered" | "read" => {
  if (status === "read" || status === "delivered" || status === "sent" || status === "sending") {
    return status;
  }
  return "sending";
};

const isDocumentMime = (mimeType?: string): boolean => {
  const lower = String(mimeType ?? "").toLowerCase();
  return (
    lower.includes("pdf") ||
    lower.includes("zip") ||
    lower.includes("rar") ||
    lower.includes("sheet") ||
    lower.includes("excel") ||
    lower.includes("word") ||
    lower.includes("document") ||
    lower.includes("presentation")
  );
};

const noop = () => {};

export const MessageBubble = ({
  message,
  isOwn,
  showAvatar,
  isGrouped,
  onLongPress,
}: MessageBubbleProps) => {
  const scale = useSharedValue(0.85);
  const opacity = useSharedValue(0);

  const bubbleKind = useMemo(() => determineBubbleKind(message), [message]);
  const mediaUri = useMemo(() => message.mediaUri ?? message.mediaUrl ?? "", [message.mediaUri, message.mediaUrl]);
  const messageText = useMemo(() => String(message.text ?? "").trim(), [message.text]);
  const combinedImageAndText = bubbleKind === "image" && Boolean(mediaUri) && messageText.length > 0;
  const deliveryStatus = useMemo(() => mapDeliveryStatus(message.status), [message.status]);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 14, stiffness: 170, mass: 0.75 });
    opacity.value = withTiming(1, { duration: ENTRANCE_OPACITY_DURATION });
  }, [opacity, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const handleLongPress = () => {
    onLongPress();
  };

  return (
    <Animated.View style={[styles.messageRow, isGrouped ? styles.groupedRow : styles.ungroupedRow, animatedStyle]}>
      <View style={[styles.innerRow, isOwn ? styles.ownRow : styles.otherRow]}>
        {!isOwn && showAvatar ? (
          <View style={styles.avatarWrap}>
            <Avatar
              name={message.authorName ?? "User"}
              uri={message.authorAvatar ?? undefined}
              size={AVATAR_SIZE}
            />
          </View>
        ) : null}

        <View style={styles.bubbleColumn}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Message actions"
            onLongPress={handleLongPress}
            delayLongPress={tokens.timing.normal}
          >
            {combinedImageAndText ? (
              <View
                style={[
                  styles.textBubble,
                  isOwn ? styles.ownBubble : styles.otherBubble,
                  isOwn ? styles.alignEnd : styles.alignStart,
                ]}
              >
                <Image
                  source={{ uri: mediaUri }}
                  placeholder={{ blurhash: message.blurhash ?? DEFAULT_BLURHASH }}
                  contentFit="cover"
                  transition={tokens.timing.fast}
                  style={styles.combinedImage}
                />
                <Text allowFontScaling={true} style={[styles.messageText, isOwn ? styles.ownText : styles.otherText]}>
                  {messageText}
                </Text>
                {isGrouped ? null : (
                  <View
                    style={[
                      styles.tailBase,
                      isOwn ? styles.ownTail : styles.otherTail,
                      isOwn ? styles.ownTailPosition : styles.otherTailPosition,
                    ]}
                  />
                )}
              </View>
            ) : bubbleKind === "image" && mediaUri ? (
              <ImageBubble
                uri={mediaUri}
                isOwn={isOwn}
                blurhash={message.blurhash}
                hideTail={isGrouped}
                onPress={noop}
              />
            ) : bubbleKind === "video" && mediaUri ? (
              <VideoBubble
                thumbnailUri={message.thumbnailUri ?? mediaUri}
                duration={Number(message.duration ?? 0)}
                isOwn={isOwn}
                hideTail={isGrouped}
                onPress={noop}
              />
            ) : bubbleKind === "audio" && mediaUri ? (
              <AudioBubble
                uri={mediaUri}
                duration={Number(message.duration ?? 0)}
                isOwn={isOwn}
                hideTail={isGrouped}
              />
            ) : bubbleKind === "document" || isDocumentMime(message.mimeType) ? (
              <DocumentBubble
                uri={mediaUri}
                mimeType={message.mimeType ?? "application/octet-stream"}
                fileSize={Number(message.fileSize ?? 0)}
                isOwn={isOwn}
                hideTail={isGrouped}
              />
            ) : (
              <View
                style={[
                  styles.textBubble,
                  isOwn ? styles.ownBubble : styles.otherBubble,
                  isOwn ? styles.alignEnd : styles.alignStart,
                ]}
              >
                <Text allowFontScaling={true} style={[styles.messageText, isOwn ? styles.ownText : styles.otherText]}>
                  {messageText}
                </Text>
                {isGrouped ? null : (
                  <View
                    style={[
                      styles.tailBase,
                      isOwn ? styles.ownTail : styles.otherTail,
                      isOwn ? styles.ownTailPosition : styles.otherTailPosition,
                    ]}
                  />
                )}
              </View>
            )}
          </Pressable>

          {isOwn ? (
            <View style={styles.deliveryWrap}>
              <DeliveryStatus status={deliveryStatus} />
            </View>
          ) : null}
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  messageRow: {
    width: "100%",
  },
  groupedRow: {
    marginTop: tokens.spacing.xs,
  },
  ungroupedRow: {
    marginTop: tokens.spacing.md,
  },
  innerRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "flex-end",
  },
  ownRow: {
    justifyContent: "flex-end",
  },
  otherRow: {
    justifyContent: "flex-start",
  },
  avatarWrap: {
    marginRight: tokens.spacing.sm,
    alignSelf: "flex-end",
  },
  bubbleColumn: {
    maxWidth: "100%",
  },
  textBubble: {
    width: "100%",
    maxWidth: "75%",
    borderRadius: tokens.radii.bubble,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    position: "relative",
  },
  ownBubble: {
    backgroundColor: tokens.colors.bubbleSent,
  },
  otherBubble: {
    backgroundColor: tokens.colors.bubbleReceived,
  },
  alignEnd: {
    alignSelf: "flex-end",
  },
  alignStart: {
    alignSelf: "flex-start",
  },
  messageText: {
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.regular,
  },
  ownText: {
    color: tokens.colors.bubbleSentText,
  },
  otherText: {
    color: tokens.colors.bubbleReceivedText,
  },
  combinedImage: {
    width: tokens.fontSize.large * 11,
    height: tokens.fontSize.large * 8,
    borderRadius: tokens.radii.bubble,
    marginBottom: tokens.spacing.sm,
  },
  tailBase: {
    width: 0,
    height: 0,
    borderTopWidth: TAIL_SIZE,
    borderBottomWidth: 0,
    borderLeftWidth: TAIL_SIZE,
    borderRightWidth: TAIL_SIZE,
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
    position: "absolute",
    bottom: 0,
  },
  ownTail: {
    borderLeftColor: "transparent",
    borderRightColor: tokens.colors.bubbleSent,
  },
  otherTail: {
    borderRightColor: "transparent",
    borderLeftColor: tokens.colors.bubbleReceived,
  },
  ownTailPosition: {
    right: tokens.spacing.xs,
  },
  otherTailPosition: {
    left: tokens.spacing.xs,
  },
  deliveryWrap: {
    marginTop: tokens.spacing.xs,
    alignItems: "flex-end",
  },
});
