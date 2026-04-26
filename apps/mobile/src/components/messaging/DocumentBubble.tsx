import React, { useCallback, useMemo, useState } from "react";
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

import { tokens } from "@/src/theme/tokens";

const TAIL_SIZE = tokens.spacing.sm - tokens.spacing.xs / 2;
const ICON_SIZE = tokens.spacing.xl;
const ACTION_ICON_SIZE = tokens.fontSize.title;
const PROGRESS_HEIGHT = tokens.spacing.xs;
const PROGRESS_DURATION = tokens.timing.fast;

type DownloadState = "idle" | "downloading" | "done";

interface DocumentMeta {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  extension: string;
}

export interface DocumentBubbleProps {
  uri: string;
  mimeType: string;
  fileSize: number;
  isOwn: boolean;
  hideTail?: boolean;
}

const formatFileSize = (bytes: number): string => {
  const safe = Math.max(0, bytes);
  const kb = safe / 1024;
  if (kb < 1024) {
    return `${Math.max(1, Math.round(kb))} KB`;
  }
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
};

const resolveDocumentMeta = (mimeType: string): DocumentMeta => {
  const lower = mimeType.toLowerCase();

  if (lower.includes("pdf")) {
    return { icon: "document-text", label: "PDF", extension: "pdf" };
  }
  if (lower.includes("zip") || lower.includes("rar") || lower.includes("x-7z")) {
    return { icon: "archive", label: "Archive", extension: "zip" };
  }
  if (
    lower.includes("sheet") ||
    lower.includes("excel") ||
    lower.includes("xls") ||
    lower.includes("xlsx") ||
    lower.includes("csv")
  ) {
    return { icon: "grid", label: "Spreadsheet", extension: "csv" };
  }
  if (lower.includes("powerpoint") || lower.includes("presentation") || lower.includes("ppt")) {
    return { icon: "easel", label: "Presentation", extension: "pptx" };
  }
  if (lower.includes("word") || lower.includes("document") || lower.includes("doc")) {
    return { icon: "document", label: "Document", extension: "docx" };
  }
  return { icon: "attach", label: "File", extension: "bin" };
};

const buildTargetUri = (extension: string): string | null => {
  const base = FileSystem.cacheDirectory;
  if (!base) return null;
  return `${base}msg-doc-${Date.now()}.${extension}`;
};

export const DocumentBubble = ({
  uri,
  mimeType,
  fileSize,
  isOwn,
  hideTail = false,
}: DocumentBubbleProps) => {
  const [downloadState, setDownloadState] = useState<DownloadState>("idle");
  const [savedUri, setSavedUri] = useState<string | null>(null);
  const [trackWidth, setTrackWidth] = useState(0);
  const progress = useSharedValue(0);

  const meta = useMemo(() => resolveDocumentMeta(mimeType), [mimeType]);
  const fileSizeLabel = useMemo(() => formatFileSize(fileSize), [fileSize]);

  const progressStyle = useAnimatedStyle(() => ({
    width: trackWidth * progress.value,
  }));

  const onProgressTrackLayout = useCallback((event: LayoutChangeEvent) => {
    setTrackWidth(event.nativeEvent.layout.width);
  }, []);

  const openSharedDocument = useCallback(async (localUri: string) => {
    const available = await Sharing.isAvailableAsync();
    if (!available) return;
    await Sharing.shareAsync(localUri);
  }, []);

  const handleDownload = useCallback(async () => {
    if (downloadState === "downloading") return;
    if (downloadState === "done" && savedUri) {
      await openSharedDocument(savedUri);
      return;
    }

    const targetUri = buildTargetUri(meta.extension);
    if (!targetUri) return;

    setDownloadState("downloading");
    progress.value = 0;

    try {
      const task = FileSystem.createDownloadResumable(uri, targetUri, {}, (event) => {
        const total = event.totalBytesExpectedToWrite || 1;
        const ratio = Math.min(1, event.totalBytesWritten / total);
        progress.value = withTiming(ratio, { duration: PROGRESS_DURATION });
      });
      const result = await task.downloadAsync();

      if (!result?.uri) {
        setDownloadState("idle");
        progress.value = 0;
        return;
      }

      setSavedUri(result.uri);
      progress.value = withTiming(1, { duration: PROGRESS_DURATION });
      setDownloadState("done");
      await openSharedDocument(result.uri);
    } catch {
      setDownloadState("idle");
      progress.value = withTiming(0, { duration: PROGRESS_DURATION });
    }
  }, [downloadState, meta.extension, openSharedDocument, progress, savedUri, uri]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open document message"
      onPress={() => {
        void handleDownload();
      }}
      style={[styles.container, isOwn ? styles.ownContainer : styles.otherContainer]}
    >
      <View style={[styles.bubble, isOwn ? styles.ownBubble : styles.otherBubble]}>
        <View style={styles.row}>
          <View style={styles.leftWrap}>
            <Ionicons
              name={meta.icon}
              size={ICON_SIZE}
              color={isOwn ? tokens.colors.bubbleSentText : tokens.colors.bubbleReceivedText}
            />
          </View>

          <View style={styles.centerWrap}>
            <Text
              allowFontScaling={true}
              style={[styles.typeText, isOwn ? styles.ownText : styles.otherText]}
            >
              {meta.label}
            </Text>
          </View>

          <View style={styles.rightWrap}>
            {downloadState === "done" ? (
              <Ionicons
                name="checkmark-circle"
                size={ACTION_ICON_SIZE}
                color={tokens.colors.success}
              />
            ) : downloadState === "idle" ? (
              <Ionicons
                name="download-outline"
                size={ACTION_ICON_SIZE}
                color={isOwn ? tokens.colors.bubbleSentText : tokens.colors.bubbleReceivedText}
              />
            ) : null}
            <Text
              allowFontScaling={true}
              style={[styles.sizeText, isOwn ? styles.ownText : styles.otherText]}
            >
              {fileSizeLabel}
            </Text>
          </View>
        </View>

        {downloadState === "downloading" ? (
          <View onLayout={onProgressTrackLayout} style={styles.progressTrack}>
            <Animated.View style={[styles.progressBar, progressStyle]} />
          </View>
        ) : null}
      </View>

      {hideTail ? null : (
        <View
          style={[
            styles.tailBase,
            isOwn ? styles.ownTail : styles.otherTail,
            isOwn ? styles.ownTailPosition : styles.otherTailPosition,
          ]}
        />
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    maxWidth: "75%",
    position: "relative",
  },
  ownContainer: {
    alignSelf: "flex-end",
  },
  otherContainer: {
    alignSelf: "flex-start",
  },
  bubble: {
    borderRadius: tokens.radii.bubble,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    gap: tokens.spacing.sm,
  },
  ownBubble: {
    backgroundColor: tokens.colors.bubbleSent,
  },
  otherBubble: {
    backgroundColor: tokens.colors.bubbleReceived,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
  },
  leftWrap: {
    width: ICON_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  centerWrap: {
    flex: 1,
    justifyContent: "center",
  },
  rightWrap: {
    alignItems: "flex-end",
    justifyContent: "center",
    gap: tokens.spacing.xs,
  },
  typeText: {
    fontSize: tokens.fontSize.bodyMd,
    fontWeight: tokens.fontWeight.semibold,
  },
  sizeText: {
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.medium,
  },
  ownText: {
    color: tokens.colors.bubbleSentText,
  },
  otherText: {
    color: tokens.colors.bubbleReceivedText,
  },
  progressTrack: {
    width: "100%",
    height: PROGRESS_HEIGHT,
    borderRadius: tokens.radii.pill,
    backgroundColor: tokens.colors.separator,
    overflow: "hidden",
  },
  progressBar: {
    height: PROGRESS_HEIGHT,
    borderRadius: tokens.radii.pill,
    backgroundColor: tokens.colors.primary,
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
});
