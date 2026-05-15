import React, { useState, useEffect } from "react";
import { View, Image as RNImage } from "react-native";
import { useContentWidth } from "@/lib/contentWidth";
import { Image } from "expo-image";
import { MarkdownText } from "@/components/ui/MarkdownText";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { Text } from "@/components/ScaledText";
import { SkeletonBox } from "@/components/ui/legacy-skeleton";

type AdminStorySectionProps = {
  story?: string | null;
  photoUrl?: string | null;
  loading?: boolean;
};

export const AdminStorySection = React.memo(function AdminStorySection({ story, photoUrl, loading }: AdminStorySectionProps) {
  const p = useAdminPastel();
  const width = useContentWidth();
  const photo = photoUrl?.trim() || "";
  const storyText = story?.trim() || "";

  const [aspectRatio, setAspectRatio] = useState<number>(1);

  useEffect(() => {
    if (photo) {
      RNImage.getSize(photo, (w, h) => {
        if (w && h) setAspectRatio(w / h);
      }, () => setAspectRatio(1));
    }
  }, [photo]);

  if (!storyText && !photo && !loading) return null;

  const cardW = width - 40;

  return (
    <View style={{ gap: 10 }}>
      <Text style={{ color: p.textPrimary, fontSize: 20, fontFamily: "Outfit-Bold", paddingHorizontal: 2 }}>
        Coach story
      </Text>

      {loading ? (
        <View style={{ gap: 8 }}>
          <SkeletonBox width={cardW} height={160} borderRadius={20} />
          <View style={{ gap: 4, paddingHorizontal: 4 }}>
            <SkeletonBox width="60%" height={18} borderRadius={4} />
            <SkeletonBox width="85%" height={13} borderRadius={4} />
            <SkeletonBox width="70%" height={13} borderRadius={4} />
          </View>
        </View>
      ) : (
        <View
          style={{
            borderRadius: 24,
            backgroundColor: p.cardWhite,
            overflow: "hidden",
          }}
        >
          {photo ? (
            <View
              style={{
                backgroundColor: p.inputBg,
                width: "100%",
                aspectRatio,
              }}
            >
              <Image
                source={{ uri: photo }}
                contentFit="cover"
                transition={300}
                style={{ width: "100%", height: "100%" }}
              />
            </View>
          ) : null}

          {storyText ? (
            <View style={{ padding: 20 }}>
              <MarkdownText
                text={storyText}
                baseStyle={{ fontSize: 15, lineHeight: 24, color: p.textSecondary }}
                headingStyle={{ fontSize: 18, lineHeight: 26, color: p.textPrimary, fontWeight: "700", marginTop: 12 }}
                subheadingStyle={{ fontSize: 16, lineHeight: 24, color: p.textPrimary, fontWeight: "700", marginTop: 8 }}
                listItemStyle={{ paddingLeft: 6 }}
              />
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
});
