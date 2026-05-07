import React, { useState, useEffect } from "react";
import { View, Modal, TextInput, Pressable, ScrollView } from "react-native";
import { Text } from "@/components/ScaledText";
import { Skeleton } from "@/components/Skeleton";
import { formatIsoShort } from "@/lib/admin-utils";

interface BookingDetailModalProps {
  isVisible: boolean;
  onClose: () => void;
  booking: any;
  detail: any;
  isLoading: boolean;
  onUpdateStatus: (id: number, status: any, updates?: any) => void;
  isMutating: boolean;
  colors: any;
  isDark: boolean;
  insetsTop: number;
}

export function BookingDetailModal({
  isVisible,
  onClose,
  booking,
  detail,
  isLoading,
  onUpdateStatus,
  isMutating,
  colors,
  isDark,
  insetsTop,
}: BookingDetailModalProps) {
  const [confirmLocation, setConfirmLocation] = useState("");
  const status = detail?.status ?? booking?.status ?? "—";
  const statusColor =
    status === "confirmed" ? colors.success :
    status === "pending" ? colors.warning :
    status === "cancelled" || status === "declined" ? colors.danger :
    colors.textSecondary;

  useEffect(() => {
    if (isVisible) {
      setConfirmLocation(detail?.location || booking?.location || "");
    }
  }, [isVisible, detail, booking]);

  const needsLocation = !detail?.location && !booking?.location;

  return (
    <Modal
      visible={isVisible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: colors.overlay,
          justifyContent: "center",
          paddingHorizontal: 20,
          paddingTop: insetsTop + 16,
          paddingBottom: 24,
        }}
      >
        <Pressable style={{ position: "absolute", inset: 0 }} onPress={onClose} />
        <View
          style={{
            maxHeight: "88%",
            borderRadius: 30,
            backgroundColor: colors.cardWhite,
            shadowColor: colors.shadowMd ?? colors.shadow,
            shadowOpacity: 1,
            shadowRadius: 22,
            shadowOffset: { width: 0, height: 10 },
            elevation: isDark ? 0 : 10,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              paddingHorizontal: 20,
              paddingTop: 20,
              paddingBottom: 14,
              borderBottomWidth: 1,
              borderBottomColor: colors.divider,
              flexDirection: "row",
              alignItems: "center",
              gap: 14,
            }}
          >
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                style={{
                  fontFamily: "Outfit-ExtraBold",
                  fontSize: 22,
                  color: colors.textPrimary,
                  letterSpacing: -0.4,
                }}
                numberOfLines={1}
              >
                Booking #{booking?.id ?? ""}
              </Text>
              <Text
                style={{
                  fontFamily: "Outfit-Regular",
                  fontSize: 13,
                  color: colors.textSecondary,
                  marginTop: 2,
                }}
              >
                Details and actions
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              style={({ pressed }) => ({
                height: 38,
                paddingHorizontal: 16,
                borderRadius: 100,
                backgroundColor: colors.inputBg,
                alignItems: "center",
                justifyContent: "center",
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ fontFamily: "Outfit-Bold", fontSize: 12, color: colors.textSecondary }}>
                Done
              </Text>
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 18, gap: 14 }}
          >
            <View
              style={{
                borderRadius: 24,
                padding: 16,
                backgroundColor: colors.cardMint,
              }}
            >
              <View style={{ gap: 4 }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <Text
                    style={{
                      flex: 1,
                      fontFamily: "Outfit-Bold",
                      fontSize: 17,
                      color: colors.textPrimary,
                    }}
                    numberOfLines={1}
                  >
                    {booking?.serviceName ?? "(service)"}
                  </Text>
                  <View
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 100,
                      backgroundColor: colors.cardWhite,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: "Outfit-Bold",
                        fontSize: 10,
                        color: statusColor,
                        textTransform: "uppercase",
                        letterSpacing: 1,
                      }}
                    >
                      {status}
                    </Text>
                  </View>
                </View>
                <Text
                  style={{
                    fontFamily: "Outfit-Regular",
                    fontSize: 13,
                    color: colors.textSecondary,
                    lineHeight: 18,
                  }}
                  numberOfLines={2}
                >
                  {booking?.athleteName ?? "(athlete)"} •{" "}
                  {formatIsoShort(booking?.startsAt)}
                </Text>
              </View>

              {detail?.status === "pending" || booking?.status === "pending" ? (
                <View style={{ marginTop: 16, gap: 12 }}>
                  {needsLocation && (
                    <View style={{ gap: 7 }}>
                      <Text
                        style={{
                          fontFamily: "Outfit-Bold",
                          fontSize: 10,
                          color: colors.accent,
                          textTransform: "uppercase",
                          letterSpacing: 1.1,
                          marginLeft: 2,
                        }}
                      >
                        Set Location (Required to confirm)
                      </Text>
                      <TextInput
                        value={confirmLocation}
                        onChangeText={setConfirmLocation}
                        placeholder="e.g. Virtual / Studio A"
                        placeholderTextColor={colors.textMuted}
                        style={{
                          height: 44,
                          paddingHorizontal: 14,
                          borderRadius: 14,
                          borderWidth: 1,
                          backgroundColor: colors.cardWhite,
                          borderColor: colors.inputBorder,
                          fontFamily: "Outfit-Regular",
                          fontSize: 14,
                          color: colors.textPrimary,
                        }}
                      />
                    </View>
                  )}
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <PastelAction
                      label="Confirm"
                      tone="success"
                      onPress={() =>
                        booking && onUpdateStatus(booking.id, "confirmed", needsLocation ? { location: confirmLocation } : undefined)
                      }
                      disabled={isMutating || (needsLocation && !confirmLocation.trim())}
                      colors={colors}
                    />
                    <PastelAction
                      label="Decline"
                      tone="danger"
                      onPress={() =>
                        booking && onUpdateStatus(booking.id, "declined")
                      }
                      disabled={isMutating}
                      colors={colors}
                    />
                  </View>
                </View>
              ) : (
                <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
                  <PastelAction
                    label="Cancel"
                    tone="danger"
                    onPress={() =>
                      booking && onUpdateStatus(booking.id, "cancelled")
                    }
                    disabled={isMutating}
                    colors={colors}
                  />
                </View>
              )}
            </View>

            <View
              style={{
                borderRadius: 24,
                padding: 16,
                backgroundColor: colors.inputBg,
                borderWidth: 1,
                borderColor: colors.inputBorder,
              }}
            >
              {isLoading ? (
                <View style={{ gap: 8 }}>
                  <Skeleton width="82%" height={12} />
                  <Skeleton width="88%" height={12} />
                  <Skeleton width="76%" height={12} />
                </View>
              ) : detail ? (
                <View style={{ gap: 9 }}>
                  <DetailRow label="Guardian" value={`${detail.guardianName ?? "—"} • ${detail.guardianEmail ?? "—"}`} colors={colors} />
                  <DetailRow label="Window" value={`${formatIsoShort(detail.startsAt)} → ${formatIsoShort(detail.endTime)}`} colors={colors} />
                  {detail.slotsTotal != null && (
                    <DetailRow label="Capacity" value={`${detail.slotsUsed ?? 0}/${detail.slotsTotal}`} colors={colors} />
                  )}
                  {detail.location && (
                    <DetailRow label="Location" value={detail.location} colors={colors} />
                  )}
                  {detail.meetingLink && (
                    <DetailRow label="Meeting" value={detail.meetingLink} colors={colors} selectable />
                  )}
                  
                  {/* Location input below Meeting link if requested (if not already set in detail and we are in edit mode) */}
                  {!needsLocation && (detail?.status === "pending" || booking?.status === "pending") && (
                    <View style={{ marginTop: 4, gap: 7 }}>
                      <Text
                        style={{
                          fontFamily: "Outfit-Bold",
                          fontSize: 10,
                          color: colors.textSecondary,
                          textTransform: "uppercase",
                          letterSpacing: 1.1,
                        }}
                      >
                        Update Location
                      </Text>
                      <TextInput
                        value={confirmLocation}
                        onChangeText={setConfirmLocation}
                        placeholder="Update location..."
                        placeholderTextColor={colors.textMuted}
                        style={{
                          height: 42,
                          paddingHorizontal: 12,
                          borderRadius: 14,
                          borderWidth: 1,
                          backgroundColor: colors.cardWhite,
                          borderColor: colors.inputBorder,
                          fontFamily: "Outfit-Regular",
                          fontSize: 13,
                          color: colors.textPrimary,
                        }}
                      />
                    </View>
                  )}

                  {detail.notes && (
                    <DetailRow label="Notes" value={detail.notes} colors={colors} selectable />
                  )}
                  {detail.createdAt && (
                    <DetailRow label="Created" value={formatIsoShort(detail.createdAt)} colors={colors} />
                  )}
                </View>
              ) : (
                <Text style={{ fontFamily: "Outfit-Regular", fontSize: 13, color: colors.textSecondary }}>
                  No detail loaded.
                </Text>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function PastelAction({
  label,
  tone,
  onPress,
  disabled,
  colors,
}: {
  label: string;
  tone: "success" | "danger";
  onPress: () => void;
  disabled?: boolean;
  colors: any;
}) {
  const tint = tone === "success" ? colors.success : colors.danger;
  const bg = tone === "success" ? colors.successSoft : colors.dangerSoft;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        flex: 1,
        height: 44,
        borderRadius: 14,
        backgroundColor: bg,
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled ? 0.45 : pressed ? 0.72 : 1,
      })}
    >
      <Text style={{ fontFamily: "Outfit-Bold", fontSize: 12, color: tint, textTransform: "uppercase" }}>
        {label}
      </Text>
    </Pressable>
  );
}

function DetailRow({
  label,
  value,
  colors,
  selectable,
}: {
  label: string;
  value: string;
  colors: any;
  selectable?: boolean;
}) {
  return (
    <View>
      <Text
        style={{
          fontFamily: "Outfit-Bold",
          fontSize: 10,
          color: colors.textMuted,
          textTransform: "uppercase",
          letterSpacing: 1,
          marginBottom: 2,
        }}
      >
        {label}
      </Text>
      <Text
        selectable={selectable}
        style={{
          fontFamily: "Outfit-Regular",
          fontSize: 13,
          lineHeight: 18,
          color: colors.textSecondary,
        }}
      >
        {value}
      </Text>
    </View>
  );
}
