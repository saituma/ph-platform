import React from "react";
import { Modal, Pressable, View } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import {
  createAudioPlayer,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Feather } from "@/components/ui/theme-icons";

type VoiceRecorderModalProps = {
  open: boolean;
  onClose: () => void;
  onRecorded: (payload: { uri: string; fileName: string; sizeBytes: number; mimeType: string }) => void;
  holdToRecordActive?: boolean;
};

export function VoiceRecorderModal({
  open,
  onClose,
  onRecorded,
  holdToRecordActive = false,
}: VoiceRecorderModalProps) {
  const { colors, isDark } = useAppTheme();
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
  const holdIntentRef = React.useRef(false);
  const holdStartInFlightRef = React.useRef(false);
  const waveformBars = React.useMemo(() => Array.from({ length: 26 }, (_, index) => index), []);

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

  const startRecording = React.useCallback(async () => {
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
  }, [recorder]);

  const stopRecording = React.useCallback(async () => {
    try {
      if (!recording && !recorderState?.isRecording) return;
      await recorder.stop();
      const status = await recorder.getStatus();
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
  }, [recording, recorder, recorderState?.isRecording, recorderState?.url]);

  React.useEffect(() => {
    holdIntentRef.current = holdToRecordActive;
  }, [holdToRecordActive]);

  React.useEffect(() => {
    if (!holdToRecordActive) {
      if (recorderState?.isRecording) {
        stopRecording();
      }
      return;
    }

    if (recordedUri || recorderState?.isRecording || holdStartInFlightRef.current) {
      return;
    }

    holdStartInFlightRef.current = true;
    startRecording()
      .catch(() => {})
      .finally(() => {
        holdStartInFlightRef.current = false;
        if (!holdIntentRef.current) {
          stopRecording();
        }
      });
  }, [holdToRecordActive, recordedUri, recorderState?.isRecording, startRecording, stopRecording]);

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
          const playing = Boolean(status?.playing ?? status?.isPlaying);
          const durationRaw = Number(
            status?.durationMillis ?? status?.durationSeconds ?? status?.duration ?? 0
          );
          const currentRaw = Number(
            status?.positionMillis ?? status?.currentTimeMillis ?? status?.currentTime ?? 0
          );
          const duration =
            status?.durationMillis || status?.positionMillis
              ? Math.round(Math.max(0, durationRaw))
              : Math.round(Math.max(0, durationRaw) * 1000);
          const position =
            status?.positionMillis || status?.currentTimeMillis
              ? Math.round(Math.max(0, currentRaw))
              : Math.round(Math.max(0, currentRaw) * 1000);

          setIsPlaying(playing);
          setDurationMs(duration);
          setPositionMs(position);

          if (status?.didJustFinish || status?.ended) {
            setIsPlaying(false);
            setPositionMs(duration);
          }
        });
        setSound(player);
        player.play();
        return;
      }
      if (isPlaying) {
        sound.pause();
        setIsPlaying(false);
      } else {
        sound.play();
        setIsPlaying(true);
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

  const discardRecording = React.useCallback(() => {
    if (recorderState?.isRecording) {
      recorder.stop().catch(() => {});
    }
    resetState();
  }, [recorder, recorderState?.isRecording, resetState]);

  const retakeRecording = React.useCallback(async () => {
    try {
      if (sound?.playing) {
        sound.pause();
      }
      discardRecording();
      await new Promise((resolve) => setTimeout(resolve, 0));
      await startRecording();
    } catch (err) {
      console.warn("Failed to retake recording", err);
      setError("Unable to start a new recording.");
    }
  }, [discardRecording, sound, startRecording]);

  const playbackProgress = durationMs > 0 ? Math.min(positionMs / durationMs, 1) : 0;
  const activeWaveIndex = recordedUri
    ? Math.floor(playbackProgress * waveformBars.length)
    : isRecording
      ? Math.floor(positionMs / 180) % waveformBars.length
      : -1;

  const getWaveHeight = React.useCallback((index: number) => {
    const pattern = [10, 16, 12, 22, 14, 20, 11, 18];
    return pattern[index % pattern.length];
  }, []);

  const getWaveColor = React.useCallback((index: number) => {
    if (recordedUri) {
      return index <= activeWaveIndex
        ? colors.accent
        : colors.textSecondary;
    }
    if (isRecording) {
      return Math.abs(index - activeWaveIndex) <= 1
        ? colors.accent
        : "rgba(239,68,68,0.35)";
    }
    return colors.textSecondary;
  }, [activeWaveIndex, colors.accent, colors.textSecondary, isRecording, recordedUri]);

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={handleClose}>
      <Pressable className="flex-1 bg-black/45 justify-end" onPress={handleClose}>
        <Pressable onPress={() => {}}>
          <View
            className="border px-5 pb-5 pt-3"
            style={{
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderTopLeftRadius: 32,
              borderTopRightRadius: 32,
            }}
          >
            <View className="items-center">
              <View
                className="h-1.5 w-12 rounded-full"
                style={{ backgroundColor: "rgba(148,163,184,0.35)" }}
              />
            </View>

            <View className="mt-4 flex-row items-center justify-between">
              <View>
                <Text className="text-lg font-clash font-bold" style={{ color: colors.text }}>
                  Voice message
                </Text>
                <Text className="mt-1 text-[12px] font-outfit" style={{ color: colors.textSecondary }}>
                  {recordedUri
                    ? "Preview before sending"
                    : isRecording
                    ? "Release to finish recording"
                    : "Hold the mic or tap to record"}
                </Text>
              </View>

              <Pressable
                onPress={handleClose}
                className="h-10 w-10 rounded-full items-center justify-center"
                style={{ backgroundColor: "rgba(148,163,184,0.12)" }}
              >
                <Feather name="x" size={18} color={colors.text} />
              </Pressable>
            </View>

            {error ? (
              <View className="mt-4 rounded-[20px] px-3 py-3 border" style={{ backgroundColor: "rgba(245,158,11,0.08)", borderColor: "rgba(245,158,11,0.18)" }}>
                <Text className="text-[11px] font-medium font-outfit text-warning text-center">
                  {error}
                </Text>
              </View>
            ) : null}

            {!recordedUri ? (
              <View
                className="mt-4 rounded-[28px] border px-4 py-5"
                style={{
                  backgroundColor: "rgba(34,197,94,0.08)",
                  borderColor: "rgba(34,197,94,0.14)",
                }}
              >
                <View className="flex-row items-center gap-4">
                  <View
                    className="h-14 w-14 rounded-full items-center justify-center"
                    style={{ backgroundColor: isRecording ? "#EF4444" : colors.accent }}
                  >
                    <Feather name={isRecording ? "square" : "mic"} size={20} color="#FFFFFF" />
                  </View>

                  <View className="flex-1">
                    <View className="flex-row items-center gap-2">
                      <Text className="text-[15px] font-outfit font-semibold" style={{ color: colors.text }}>
                        {isRecording ? "Recording..." : "Ready to record"}
                      </Text>
                      {isRecording ? <View className="h-2.5 w-2.5 rounded-full bg-red-500" /> : null}
                    </View>
                    <Text className="mt-1 text-[12px] font-outfit" style={{ color: colors.textSecondary }}>
                      {formatTime(positionMs)}
                    </Text>
                  </View>
                </View>

                <View
                  className="mt-5 rounded-[24px] px-4 py-4"
                  style={{ backgroundColor: colors.card }}
                >
                  <View className="h-10 flex-row items-center justify-between">
                    {waveformBars.map((bar) => (
                      <View
                        key={bar}
                        className="w-[3px] rounded-full"
                        style={{
                          height: getWaveHeight(bar),
                          backgroundColor: getWaveColor(bar),
                          opacity: isRecording ? 1 : 0.45,
                        }}
                      />
                    ))}
                  </View>
                </View>

                <View className="mt-4 flex-row items-center justify-between">
                  <Pressable
                    onPress={discardRecording}
                    className="rounded-full px-4 py-2"
                    style={{ backgroundColor: "rgba(148,163,184,0.12)" }}
                  >
                    <Text className="text-[12px] font-outfit font-semibold" style={{ color: colors.text }}>
                      Cancel
                    </Text>
                  </Pressable>

                  <View className="rounded-full px-3 py-2" style={{ backgroundColor: "rgba(239,68,68,0.10)" }}>
                    <Text className="text-[11px] font-outfit font-bold uppercase tracking-[1.1px]" style={{ color: isRecording ? "#EF4444" : colors.textSecondary }}>
                      {isRecording ? "Release to stop" : "Tap to start"}
                    </Text>
                  </View>

                  <Pressable
                    onPress={isRecording ? stopRecording : startRecording}
                    className="h-12 w-12 rounded-full items-center justify-center"
                    style={{ backgroundColor: isRecording ? "#EF4444" : colors.accent }}
                  >
                    <Feather name={isRecording ? "square" : "mic"} size={18} color="#FFFFFF" />
                  </Pressable>
                </View>
              </View>
            ) : (
              <View
                className="mt-4 rounded-[28px] border px-4 py-4"
                style={{
                  backgroundColor: isDark ? colors.cardElevated : "#F8FAFC",
                  borderColor: colors.border,
                }}
              >
                <View className="flex-row items-center gap-3">
                  <Pressable
                    onPress={togglePlayback}
                    className="h-12 w-12 rounded-full items-center justify-center"
                    style={{ backgroundColor: colors.accent }}
                  >
                    <Feather name={isPlaying ? "pause" : "play"} size={18} color="#FFFFFF" />
                  </Pressable>

                  <View className="flex-1">
                    <View className="h-10 flex-row items-center justify-between">
                      {waveformBars.map((bar) => (
                        <View
                          key={bar}
                          className="w-[3px] rounded-full"
                          style={{
                            height: getWaveHeight(bar),
                            backgroundColor: getWaveColor(bar),
                            opacity: 0.95,
                          }}
                        />
                      ))}
                    </View>
                    <View className="mt-2 flex-row items-center justify-between">
                      <Text className="text-[12px] font-outfit font-semibold" style={{ color: colors.text }}>
                        Voice note
                      </Text>
                      <Text className="text-[12px] font-outfit" style={{ color: colors.textSecondary }}>
                        {formatTime(positionMs || durationMs)} / {formatTime(durationMs)}
                      </Text>
                    </View>
                  </View>
                </View>

                <View className="mt-4 flex-row items-center justify-between">
                  <Pressable
                    onPress={discardRecording}
                    className="h-12 w-12 rounded-full items-center justify-center"
                    style={{ backgroundColor: "rgba(239,68,68,0.10)" }}
                  >
                    <Feather name="trash-2" size={18} color="#EF4444" />
                  </Pressable>

                  <Pressable
                    onPress={retakeRecording}
                    className="rounded-full px-4 py-3"
                    style={{ backgroundColor: "rgba(148,163,184,0.12)" }}
                  >
                    <Text className="text-[12px] font-outfit font-semibold" style={{ color: colors.text }}>
                      Retake
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={useRecording}
                    className="rounded-full px-5 py-3"
                    style={{ backgroundColor: colors.accent }}
                  >
                    <View className="flex-row items-center gap-2">
                      <Feather name="send" size={15} color="#FFFFFF" />
                      <Text className="text-[12px] font-outfit font-bold text-white">
                        Send voice
                      </Text>
                    </View>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
