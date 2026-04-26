import { useEffect, useMemo, useState } from "react";
import { Image, useWindowDimensions } from "react-native";

const imageSizeCache = new Map<string, { width: number; height: number }>();

function inferImageFromUri(uri: string): boolean {
  const lower = uri.toLowerCase();
  if (lower.includes("/messages/images/")) return true;
  const cleaned = lower.split("?")[0].split("#")[0];
  return /\.(jpg|jpeg|png|gif|webp|bmp|heic|heif|avif)$/.test(cleaned);
}

export function useMessageDimensions(
  mediaUrl: string | null,
  contentType: string | null,
  isUser: boolean,
) {
  const { width: screenWidth } = useWindowDimensions();
  const [naturalSize, setNaturalSize] = useState<{
    width: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    const normalizedType = String(contentType ?? "").toLowerCase().trim();
    const isImage =
      normalizedType === "image" ||
      normalizedType.startsWith("image/") ||
      (mediaUrl ? inferImageFromUri(mediaUrl) : false);
    if (!mediaUrl || !isImage) {
      setNaturalSize(null);
      return;
    }

    const cached = imageSizeCache.get(mediaUrl);
    if (cached) {
      setNaturalSize(cached);
      return;
    }

    let cancelled = false;
    Image.getSize(
      mediaUrl,
      (w, h) => {
        if (cancelled || !w || !h) return;
        const next = { width: w, height: h };
        imageSizeCache.set(mediaUrl, next);
        setNaturalSize(next);
      },
      () => {
        if (!cancelled) setNaturalSize(null);
      },
    );

    return () => {
      cancelled = true;
    };
  }, [mediaUrl, contentType]);

  const maxMediaWidth = screenWidth * (isUser ? 0.85 : 0.8);

  const mediaDimensions = useMemo(() => {
    if (!naturalSize) return { width: maxMediaWidth, height: 220 };
    const aspectRatio = naturalSize.width / naturalSize.height;
    const calculatedHeight = maxMediaWidth / aspectRatio;
    const finalHeight = Math.min(calculatedHeight, 400);
    const finalWidth =
      finalHeight === calculatedHeight ? maxMediaWidth : finalHeight * aspectRatio;
    return { width: finalWidth, height: finalHeight };
  }, [naturalSize, maxMediaWidth]);

  const youtubeHeight = Math.max(180, Math.round((maxMediaWidth * 9) / 16));

  return { maxMediaWidth, mediaDimensions, youtubeHeight };
}
