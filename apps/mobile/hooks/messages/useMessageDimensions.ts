import { useWindowDimensions, Image } from "react-native";
import { useState, useEffect, useMemo } from "react";
import { isYoutubeUrl } from "@/components/media/VideoPlayer";

export function useMessageDimensions(mediaUrl: string | null, contentType: string | null, isUser: boolean) {
  const { width: screenWidth } = useWindowDimensions();
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    if (!mediaUrl || contentType !== "image") return;
    Image.getSize(mediaUrl, (w, h) => {
      if (w && h) setNaturalSize({ width: w, height: h });
    }, () => {});
  }, [mediaUrl, contentType]);

  const maxMediaWidth = screenWidth * (isUser ? 0.85 : 0.8);

  const mediaDimensions = useMemo(() => {
    if (!naturalSize) return { width: maxMediaWidth, height: 220 };
    const aspectRatio = naturalSize.width / naturalSize.height;
    const calculatedHeight = maxMediaWidth / aspectRatio;
    const finalHeight = Math.min(calculatedHeight, 400);
    const finalWidth = finalHeight === calculatedHeight ? maxMediaWidth : finalHeight * aspectRatio;
    return { width: finalWidth, height: finalHeight };
  }, [naturalSize, maxMediaWidth]);

  const youtubeHeight = Math.max(180, Math.round((maxMediaWidth * 9) / 16));

  return { maxMediaWidth, mediaDimensions, youtubeHeight };
}
