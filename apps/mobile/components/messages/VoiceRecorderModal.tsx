import React from "react";
import { Modal, Pressable, View } from "react-native";
import * as FileSystem from "expo-file-system";
import { createAudioPlayer, RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from "expo-audio";
import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Feather } from "@/components/ui/theme-icons";

type VoiceRecorderModalProps = {
  open: boolean;
  onClose: () => void;
  onRecorded: (payload: { uri: string; fileName: string; sizeBytes: number; mimeType: string }) => void;
};

export function VoiceRecorderModal({ open, onClose, onRecorded }: VoiceRecorderModalProps) {
  const { colors } = useAppTheme();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 200);
  const [recording, setRecording] = React.useState<any | null>(null);
  const [isRecording, setIsRecording] = React.useState(false);
  const [recordedUri, setRecordedUri] = React.useState<string | null>(null);
  const [sound, setSound] = React.useState<any | null>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [durationMs, setDurationMs] = React.useState(0);
  const [positionMs, setPositionMs] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);
  const soundStatusSubscriptionRef = React.useRef<any | null>(null);

  React.useEffect(() => {
    setIsRecording(Boolean(recorderState?.isRecording));
    if (recorderState?.isRecording) {
      setPositionMs(recorderState.durationMillis ?? 0);
    }
  }, [recorderState?.durationMillis, recorderState?.isRecording]);

  React.useEffect(() => {
    if (!recordedUri && !recorderState?.isRecording && recorderState?.url) {
      setRecordedUri(recorderState.url);
    }
  }, [recordedUri, recorderState?.isRecording, recorderState?.url]);

  React.useEffect(() => {
    return () => {
      soundStatusSubscriptionRef.current?.remove?.();
      sound?.remove?.();
    };
  }, [sound]);

  const resetState = React.useCallback(() => {
    setRecording(null);
    setIsRecording(false);
    setRecordedUri(null);
    setIsPlaying(false);
    setDurationMs(0);
    setPositionMs(0);
    setError(null);
    soundStatusSubscriptionRef.current?.remove?.();
    sound?.remove?.();
    soundStatusSubscriptionRef.current = null;
    setSound(null);
  }, [sound]);

  const handleClose = React.useCallback(() => {
    if (recording || recorderState?.isRecording) {
      recorder.stop().catch(() => {});
    }
    resetState();
    onClose();
  }, [onClose, recorder, recorderState?.isRecording, recording, resetState]);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.max(0, Math.round(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const startRecording = async () => {
    try {
      setError(null);
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setError("Microphone permission is required.");
        return;
      }
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });
      await recorder.prepareToRecordAsync(RecordingPresets.HIGH_QUALITY);
      recorder.record();
      setRecording(recorder);
      setIsRecording(true);
      setRecordedUri(null);
      setPositionMs(0);
    } catch (err) {
      console.warn("Failed to start recording", err);
      setError("Unable to start recording.");
    }
  };

  const stopRecording = async () => {
    try {
      if (!recording && !recorderState?.isRecording) return;
      await recorder.stop();
      const status = recorder.getStatus();
      const uri = status?.url ?? recorderState?.url ?? null;
      setRecording(null);
      setIsRecording(false);
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      });
      if (!uri) return;
      setRecordedUri(uri);
      setDurationMs(status?.durationMillis ?? 0);
      setPositionMs(0);
    } catch (err) {
      console.warn("Failed to stop recording", err);
      setError("Unable to stop recording.");
    }
  };

  const togglePlayback = async () => {
    try {
      if (!recordedUri) return;
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      });
      if (!sound) {
        const player = createAudioPlayer({ uri: recordedUri });
        soundStatusSubscriptionRef.current = player.addListener?.("playbackStatusUpdate", (status: any) => {
          setIsPlaying(Boolean(status?.playing));
          setDurationMs(Math.round(Math.max(0, Number(status?.duration ?? 0)) * 1000));
          setPositionMs(Math.round(Math.max(0, Number(status?.currentTime ?? 0)) * 1000));
        });
        setSound(player);
        player.play();
        return;
      }
      if (sound.playing) {
        sound.pause();
      } else {
        sound.play();
      }
    } catch (err) {
      console.warn("Failed to play recording", err);
      setError("Unable to play recording.");
    }
  };

  const useRecording = async () => {
    if (!recordedUri) return;
    const info = await FileSystem.getInfoAsync(recordedUri);
    const sizeBytes = (info as any).size ?? 0;
    const extension = recordedUri.split(".").pop()?.toLowerCase() ?? "m4a";
    const mimeType =
      extension === "m4a"
        ? "audio/m4a"
        : extension === "aac"
        ? "audio/aac"
        : extension === "caf"
        ? "audio/x-caf"
        : extension === "mp3"
        ? "audio/mpeg"
        : "audio/m4a";
    const fileName = `voice-${Date.now()}.${extension}`;
    onRecorded({ uri: recordedUri, fileName, sizeBytes, mimeType });
    resetState();
    onClose();
  };

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={handleClose}>
      <Pressable className="flex-1 bg-black/40 justify-end" onPress={handleClose}>
        <Pressable className="px-5 pb-8" onPress={() => {}}>
          <View className="rounded-3xl border border-app/10 bg-app px-4 py-4">
            <Text className="text-xs font-outfit text-secondary mb-3">Record voice</Text>
            {error ? (
              <View className="mb-3 rounded-2xl bg-warning/10 px-3 py-2 border border-warning/20">
                <Text className="text-[11px] font-medium font-outfit text-warning text-center">
                  {error}
                </Text>
              </View>
            ) : null}

            <View className="rounded-2xl border border-app/10 bg-input px-4 py-4 items-center">
              <Text className="text-sm font-outfit text-app">
                {recordedUri ? "Recording ready" : isRecording ? "Recording..." : "Ready to record"}
              </Text>
              <Text className="text-xs font-outfit text-secondary mt-1">
                {recordedUri ? formatTime(durationMs) : formatTime(positionMs)}
              </Text>
            </View>

            <View className="mt-4 flex-row items-center justify-between">
              {!recording ? (
                <Pressable
                  onPress={startRecording}
                  className="rounded-2xl border border-app/10 bg-input px-4 py-3"
                >
                  <Text className="text-sm font-outfit text-app">Start</Text>
                </Pressable>
              ) : (
                <Pressable
                  onPress={stopRecording}
                  className="rounded-2xl border border-app/10 bg-input px-4 py-3"
                >
                  <Text className="text-sm font-outfit text-app">Stop</Text>
                </Pressable>
              )}

              <Pressable
                onPress={togglePlayback}
                disabled={!recordedUri}
                className={`rounded-2xl border border-app/10 bg-input px-4 py-3 ${recordedUri ? "" : "opacity-50"}`}
              >
                <View className="flex-row items-center gap-2">
                  <Feather name={isPlaying ? "pause" : "play"} size={16} color={colors.accent} />
                  <Text className="text-sm font-outfit text-app">Play</Text>
                </View>
              </Pressable>

              <Pressable
                onPress={useRecording}
                disabled={!recordedUri}
                className={`rounded-2xl border border-accent/40 bg-accent/10 px-4 py-3 ${recordedUri ? "" : "opacity-50"}`}
              >
                <Text className="text-sm font-outfit text-accent">Use</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
