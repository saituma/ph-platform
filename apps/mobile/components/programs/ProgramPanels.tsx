import React, { useState } from "react";
import { Image, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

import { apiRequest } from "@/lib/api";
import { useAppSelector } from "@/store/hooks";

export function PhysioReferralPanel({ discount }: { discount?: string }) {
  return (
    <View className="rounded-3xl border border-app/10 bg-input px-6 py-5">
      <Text className="text-lg font-clash text-app mb-2">Physio Referral</Text>
      <Text className="text-sm font-outfit text-secondary">
        Access our trusted physio partners for injuries and recovery support.
      </Text>
      <View className="mt-4 rounded-2xl border border-app/10 bg-white/5 px-4 py-3">
        <Text className="text-xs font-outfit text-secondary">
          {discount ? `Discount: ${discount}` : "Standard referral (no discount)."}
        </Text>
      </View>
      <TouchableOpacity className="mt-4 rounded-full bg-accent px-4 py-3">
        <Text className="text-white text-sm font-outfit">Open Referral Link</Text>
      </TouchableOpacity>
    </View>
  );
}

export function ParentEducationPanel({ onOpen }: { onOpen: () => void }) {
  return (
    <View className="rounded-3xl border border-app/10 bg-input px-6 py-5">
      <Text className="text-lg font-clash text-app mb-2">Parent Education Hub</Text>
      <Text className="text-sm font-outfit text-secondary">
        Explore curated courses on growth, recovery, nutrition, and mindset.
      </Text>
      <TouchableOpacity onPress={onOpen} className="mt-4 rounded-full bg-accent px-4 py-3">
        <Text className="text-white text-sm font-outfit">Open Parent Education</Text>
      </TouchableOpacity>
    </View>
  );
}

export function BookingsPanel({ onOpen }: { onOpen: () => void }) {
  return (
    <View className="rounded-3xl border border-app/10 bg-input px-6 py-5">
      <Text className="text-lg font-clash text-app mb-2">Bookings</Text>
      <Text className="text-sm font-outfit text-secondary">
        Book one-to-one sessions, lift lab visits, or role model meetings.
      </Text>
      <TouchableOpacity onPress={onOpen} className="mt-4 rounded-full bg-accent px-4 py-3">
        <Text className="text-white text-sm font-outfit">Go to Bookings</Text>
      </TouchableOpacity>
    </View>
  );
}

export function FoodDiaryPanel() {
  const [entry, setEntry] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [entries, setEntries] = useState<{ id: string; text: string; photo?: string }[]>([]);

  const handlePickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setPhoto(result.assets[0].uri);
    }
  };

  const handleSave = () => {
    if (!entry.trim()) return;
    setEntries((prev) => [
      { id: `${Date.now()}`, text: entry.trim(), photo: photo ?? undefined },
      ...prev,
    ]);
    setEntry("");
    setPhoto(null);
  };

  return (
    <View className="gap-4">
      <View className="rounded-3xl border border-app/10 bg-input px-6 py-5">
        <Text className="text-lg font-clash text-app mb-2">Food Diary</Text>
        <Text className="text-sm font-outfit text-secondary">
          Log meals and snacks to support training and recovery.
        </Text>
        <TextInput
          value={entry}
          onChangeText={setEntry}
          placeholder="Breakfast, lunch, snacks..."
          placeholderTextColor="#9CA3AF"
          multiline
          className="mt-4 rounded-2xl border border-app/10 bg-white/5 px-4 py-3 text-sm font-outfit text-app"
          style={{ minHeight: 90 }}
        />
        {photo ? (
          <Image source={{ uri: photo }} className="mt-4 h-28 w-full rounded-2xl" resizeMode="cover" />
        ) : null}
        <View className="mt-4 flex-row gap-3">
          <TouchableOpacity onPress={handlePickPhoto} className="flex-1 rounded-full border border-app px-4 py-3">
            <Text className="text-app text-xs font-outfit text-center">Add Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSave} className="flex-1 rounded-full bg-accent px-4 py-3">
            <Text className="text-white text-xs font-outfit text-center">Save Entry</Text>
          </TouchableOpacity>
        </View>
      </View>

      {entries.length ? (
        <View className="gap-3">
          {entries.map((item) => (
            <View key={item.id} className="rounded-3xl border border-app/10 bg-input px-5 py-4">
              <Text className="text-sm font-outfit text-app">{item.text}</Text>
              {item.photo ? (
                <Image source={{ uri: item.photo }} className="mt-3 h-24 w-full rounded-2xl" resizeMode="cover" />
              ) : null}
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export function VideoUploadPanel() {
  const { token } = useAppSelector((state) => state.user);
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const handlePickVideo = async () => {
    if (!token) return;
    setStatus(null);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;

    const asset = result.assets[0];
    const uri = asset.uri;
    const fileName = uri.split("/").pop() ?? `upload-${Date.now()}.mp4`;
    const contentType = asset.mimeType || "video/mp4";
    const maxSizeBytes = 200 * 1024 * 1024;

    try {
      setUploading(true);
      const blob = await (await fetch(uri)).blob();
      const sizeBytes = blob.size;
      if (!sizeBytes || sizeBytes > maxSizeBytes) {
        throw new Error("Video exceeds 200MB limit.");
      }

      const presign = await apiRequest<{ uploadUrl: string; publicUrl: string }>("/media/presign", {
        method: "POST",
        token,
        body: {
          folder: "video-uploads",
          fileName,
          contentType,
          sizeBytes,
        },
      });
      const uploadRes = await fetch(presign.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": contentType },
        body: blob,
      });
      if (!uploadRes.ok) throw new Error("Upload failed");

      await apiRequest("/videos", {
        method: "POST",
        token,
        body: { videoUrl: presign.publicUrl, notes: notes.trim() || undefined },
      });
      setStatus("Video submitted for coach review.");
      setNotes("");
    } catch (error: any) {
      setStatus(error?.message ?? "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <View className="rounded-3xl border border-app/10 bg-input px-6 py-5">
      <Text className="text-lg font-clash text-app mb-2">Video Upload</Text>
      <Text className="text-sm font-outfit text-secondary">
        Share training clips for coach feedback and review.
      </Text>
      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder="Optional notes for your coach"
        placeholderTextColor="#9CA3AF"
        multiline
        className="mt-4 rounded-2xl border border-app/10 bg-white/5 px-4 py-3 text-sm font-outfit text-app"
        style={{ minHeight: 80 }}
      />
      {status ? (
        <Text className="text-xs font-outfit text-secondary mt-3">{status}</Text>
      ) : null}
      <TouchableOpacity
        onPress={handlePickVideo}
        disabled={uploading}
        className="mt-4 rounded-full bg-accent px-4 py-3 flex-row items-center justify-center gap-2"
      >
        <Feather name="upload" size={16} color="white" />
        <Text className="text-white text-sm font-outfit">{uploading ? "Uploading..." : "Upload Video"}</Text>
      </TouchableOpacity>
    </View>
  );
}
