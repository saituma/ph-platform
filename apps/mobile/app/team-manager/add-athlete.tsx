import React, { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useAppSelector } from "@/store/hooks";
import { fonts } from "@/constants/theme";
import { ReplaceOnce } from "@/components/navigation/ReplaceOnce";
import {
  createAthlete,
} from "@/services/teamManager/rosterService";

// ─────────────────────────────────────────────────────────────────────────────
// AddAthleteScreen
// ─────────────────────────────────────────────────────────────────────────────

export default function AddAthleteScreen() {
  const { colors, isDark } = useAppTheme();
  const insets = useAppSafeAreaInsets();
  const { token, appRole } = useAppSelector((s) => s.user);

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [age, setAge] = useState("");
  const [customPassword, setCustomPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordField, setShowPasswordField] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const usernameRef = useRef<TextInput>(null);
  const ageRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  if (appRole !== "team_manager") {
    return <ReplaceOnce href="/(tabs)" />;
  }

  const cardBg = colors.surfaceHigh;
  const cardBorder = isDark ? colors.borderMid : colors.borderMid;
  const inputBg = isDark ? colors.surfaceHigher : colors.inputBackground;

  function validate(): boolean {
    const next: Record<string, string> = {};

    if (!name.trim()) {
      next.name = "Name is required.";
    } else if (name.trim().length > 255) {
      next.name = "Name must be under 255 characters.";
    }

    if (!username.trim()) {
      next.username = "Username is required.";
    } else if (username.trim().length > 64) {
      next.username = "Username must be under 64 characters.";
    } else if (/\s/.test(username.trim())) {
      next.username = "Username cannot contain spaces.";
    }

    const ageNum = parseInt(age, 10);
    if (!age.trim()) {
      next.age = "Age is required.";
    } else if (isNaN(ageNum) || ageNum < 5 || ageNum > 99) {
      next.age = "Age must be between 5 and 99.";
    }

    if (showPasswordField && customPassword) {
      const pwValid =
        customPassword.length >= 8 &&
        customPassword.length <= 20 &&
        /[A-Z]/.test(customPassword) &&
        /[a-z]/.test(customPassword) &&
        /[0-9]/.test(customPassword) &&
        /[^A-Za-z0-9]/.test(customPassword);
      if (!pwValid) {
        next.customPassword =
          "Password must be 8–20 characters with uppercase, lowercase, number, and symbol.";
      }
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit() {
    if (!validate() || !token) return;
    setSubmitting(true);
    setServerError(null);
    try {
      await createAthlete(token, {
        name: name.trim(),
        username: username.trim().toLowerCase(),
        age: parseInt(age, 10),
        customPassword: showPasswordField && customPassword ? customPassword : undefined,
      });
      setSuccess(true);
      // Navigate back to roster after a brief success moment
      setTimeout(() => {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace("/team-manager/roster");
        }
      }, 1400);
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Failed to add athlete. Please try again.";
      setServerError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  function handleAddAnother() {
    setName("");
    setUsername("");
    setAge("");
    setCustomPassword("");
    setShowPasswordField(false);
    setSuccess(false);
    setErrors({});
    setServerError(null);
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      {/* Nav bar */}
      <View
        style={{
          paddingTop: insets.top + 12,
          paddingHorizontal: 20,
          paddingBottom: 12,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          backgroundColor: colors.background,
          borderBottomWidth: 1,
          borderBottomColor: cardBorder,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          accessibilityLabel="Go back"
          style={({ pressed }) => ({
            width: 36,
            height: 36,
            borderRadius: 10,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: pressed
              ? isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"
              : cardBg,
            borderWidth: 1,
            borderColor: cardBorder,
          })}
        >
          <Ionicons
            name="chevron-back"
            size={18}
            color={isDark ? "hsl(220,5%,75%)" : "hsl(220,8%,30%)"}
          />
        </Pressable>
        <Text
          style={{
            fontSize: 17,
            fontFamily: fonts.heading2,
            color: isDark ? "hsl(220,5%,94%)" : "hsl(220,8%,8%)",
            flex: 1,
          }}
        >
          Add Athlete
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 24,
          paddingBottom: 40 + insets.bottom,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Success state */}
        {success ? (
          <View
            style={{
              borderRadius: 20,
              borderWidth: 1,
              borderColor: colors.borderLime,
              backgroundColor: isDark
                ? "rgba(52,199,89,0.07)"
                : "rgba(22,163,74,0.06)",
              padding: 32,
              alignItems: "center",
              gap: 12,
            }}
          >
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 18,
                backgroundColor: isDark
                  ? "rgba(52,199,89,0.15)"
                  : "rgba(22,163,74,0.12)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="checkmark" size={28} color={colors.accent} />
            </View>
            <Text
              style={{
                fontSize: 18,
                fontFamily: fonts.heading2,
                color: isDark ? "hsl(220,5%,94%)" : "hsl(220,8%,8%)",
                textAlign: "center",
              }}
            >
              {name.trim()} added
            </Text>
            <Text
              style={{
                fontSize: 13,
                fontFamily: fonts.bodyRegular,
                color: colors.textSecondary,
                textAlign: "center",
              }}
            >
              The athlete has been added to your team.
            </Text>
            <Pressable
              onPress={handleAddAnother}
              style={({ pressed }) => ({
                marginTop: 8,
                paddingHorizontal: 20,
                paddingVertical: 10,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.accent,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontFamily: fonts.bodyBold,
                  color: colors.accent,
                }}
              >
                Add another athlete
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ gap: 20 }}>
            {/* Server error */}
            {serverError && (
              <View
                style={{
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: isDark
                    ? "rgba(255,107,107,0.3)"
                    : "rgba(239,68,68,0.2)",
                  backgroundColor: isDark
                    ? "rgba(255,107,107,0.08)"
                    : "rgba(239,68,68,0.06)",
                  padding: 14,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <Ionicons
                  name="alert-circle-outline"
                  size={18}
                  color={colors.danger}
                />
                <Text
                  style={{
                    flex: 1,
                    fontSize: 13,
                    fontFamily: fonts.bodyRegular,
                    color: colors.danger,
                  }}
                >
                  {serverError}
                </Text>
              </View>
            )}

            {/* Form card */}
            <View
              style={{
                borderRadius: 20,
                borderWidth: 1,
                borderColor: cardBorder,
                backgroundColor: cardBg,
                overflow: "hidden",
              }}
            >
              {/* Name */}
              <FormField
                label="Full Name"
                value={name}
                onChangeText={(v) => {
                  setName(v);
                  if (errors.name) setErrors((p) => ({ ...p, name: "" }));
                }}
                placeholder="e.g. Jordan Smith"
                error={errors.name}
                inputBg={inputBg}
                cardBorder={cardBorder}
                returnKeyType="next"
                onSubmitEditing={() => usernameRef.current?.focus()}
                isFirst
              />

              {/* Username */}
              <FormField
                ref={usernameRef}
                label="Username"
                value={username}
                onChangeText={(v) => {
                  setUsername(v.replace(/\s/g, ""));
                  if (errors.username) setErrors((p) => ({ ...p, username: "" }));
                }}
                placeholder="e.g. jordan_smith"
                hint="Used to log in. No spaces allowed."
                error={errors.username}
                inputBg={inputBg}
                cardBorder={cardBorder}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={() => ageRef.current?.focus()}
              />

              {/* Age */}
              <FormField
                ref={ageRef}
                label="Age"
                value={age}
                onChangeText={(v) => {
                  setAge(v.replace(/[^0-9]/g, ""));
                  if (errors.age) setErrors((p) => ({ ...p, age: "" }));
                }}
                placeholder="e.g. 16"
                error={errors.age}
                inputBg={inputBg}
                cardBorder={cardBorder}
                keyboardType="number-pad"
                returnKeyType="done"
              />
            </View>

            {/* Optional password section */}
            <View>
              <Pressable
                onPress={() => setShowPasswordField((v) => !v)}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  paddingVertical: 4,
                  opacity: pressed ? 0.7 : 1,
                })}
                accessibilityLabel="Toggle custom password"
              >
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 6,
                    borderWidth: 1.5,
                    borderColor: showPasswordField
                      ? colors.accent
                      : isDark
                        ? colors.borderStrong
                        : colors.borderMid,
                    backgroundColor: showPasswordField
                      ? colors.accent
                      : "transparent",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {showPasswordField && (
                    <Ionicons name="checkmark" size={12} color={colors.background} />
                  )}
                </View>
                <Text
                  style={{
                    fontSize: 14,
                    fontFamily: fonts.bodyMedium,
                    color: isDark ? "hsl(220,5%,75%)" : "hsl(220,8%,30%)",
                  }}
                >
                  Set a custom password
                </Text>
              </Pressable>

              {showPasswordField && (
                <View
                  style={{
                    marginTop: 12,
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: cardBorder,
                    backgroundColor: cardBg,
                    overflow: "hidden",
                  }}
                >
                  <FormField
                    ref={passwordRef}
                    label="Password"
                    value={customPassword}
                    onChangeText={(v) => {
                      setCustomPassword(v);
                      if (errors.customPassword)
                        setErrors((p) => ({ ...p, customPassword: "" }));
                    }}
                    placeholder="8–20 chars, mixed case, number, symbol"
                    hint="Must be 8–20 characters with uppercase, lowercase, a number, and a symbol."
                    error={errors.customPassword}
                    inputBg={inputBg}
                    cardBorder={cardBorder}
                    secureTextEntry={!showPassword}
                    returnKeyType="done"
                    isFirst
                    rightAction={
                      <Pressable
                        onPress={() => setShowPassword((v) => !v)}
                        hitSlop={8}
                      >
                        <Ionicons
                          name={showPassword ? "eye-off-outline" : "eye-outline"}
                          size={18}
                          color={isDark ? "hsl(220,5%,50%)" : "hsl(220,5%,55%)"}
                        />
                      </Pressable>
                    }
                  />
                </View>
              )}
            </View>

            {/* Submit */}
            <Pressable
              onPress={handleSubmit}
              disabled={submitting}
              accessibilityLabel="Add athlete"
              style={({ pressed }) => ({
                borderRadius: 16,
                backgroundColor: submitting
                  ? isDark
                    ? "rgba(52,199,89,0.4)"
                    : "rgba(22,163,74,0.4)"
                  : colors.accent,
                paddingVertical: 16,
                alignItems: "center",
                justifyContent: "center",
                opacity: pressed ? 0.85 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              })}
            >
              {submitting ? (
                <ActivityIndicator color={colors.background} size="small" />
              ) : (
                <Text
                  style={{
                    fontSize: 16,
                    fontFamily: fonts.bodyBold,
                    color: colors.background,
                    letterSpacing: 0.1,
                  }}
                >
                  Add Athlete
                </Text>
              )}
            </Pressable>

            {/* Info note */}
            <Text
              style={{
                fontSize: 12,
                fontFamily: fonts.bodyRegular,
                color: colors.textSecondary,
                textAlign: "center",
                lineHeight: 18,
              }}
            >
              If no password is set, the athlete will be prompted to create one on first login.
            </Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FormField
// ─────────────────────────────────────────────────────────────────────────────

const FormField = React.forwardRef<
  TextInput,
  {
    label: string;
    value: string;
    onChangeText: (v: string) => void;
    placeholder?: string;
    hint?: string;
    error?: string;
    inputBg: string;
    cardBorder: string;
    isFirst?: boolean;
    secureTextEntry?: boolean;
    keyboardType?: "default" | "number-pad" | "email-address";
    autoCapitalize?: "none" | "sentences" | "words" | "characters";
    autoCorrect?: boolean;
    returnKeyType?: "next" | "done" | "go";
    onSubmitEditing?: () => void;
    rightAction?: React.ReactNode;
  }
>(function FormField(
  {
    label,
    value,
    onChangeText,
    placeholder,
    hint,
    error,
    inputBg,
    cardBorder,
    isFirst,
    secureTextEntry,
    keyboardType = "default",
    autoCapitalize = "words",
    autoCorrect = true,
    returnKeyType,
    onSubmitEditing,
    rightAction,
  },
  ref,
) {
  const { colors, isDark } = useAppTheme();

  return (
    <View>
      {!isFirst && (
        <View
          style={{
            height: 1,
            backgroundColor: isDark ? colors.borderSubtle : colors.borderMid,
            marginLeft: 16,
          }}
        />
      )}
      <View style={{ padding: 16, gap: 8 }}>
        <Text
          style={{
            fontSize: 11,
            fontFamily: fonts.labelBold,
            color: isDark ? "hsl(220,5%,50%)" : "hsl(220,5%,46%)",
            textTransform: "uppercase",
            letterSpacing: 0.8,
          }}
        >
          {label}
        </Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            borderRadius: 12,
            borderWidth: 1,
            borderColor: error
              ? isDark
                ? "rgba(255,107,107,0.5)"
                : "rgba(239,68,68,0.4)"
              : cardBorder,
            backgroundColor: inputBg,
            paddingHorizontal: 14,
            paddingVertical: 12,
            gap: 8,
          }}
        >
          <TextInput
            ref={ref}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={
              isDark ? "hsl(220,5%,38%)" : "hsl(220,5%,62%)"
            }
            style={{
              flex: 1,
              fontSize: 15,
              fontFamily: fonts.bodyRegular,
              color: isDark ? "hsl(220,5%,92%)" : "hsl(220,8%,10%)",
              padding: 0,
            }}
            secureTextEntry={secureTextEntry}
            keyboardType={keyboardType}
            autoCapitalize={autoCapitalize}
            autoCorrect={autoCorrect}
            returnKeyType={returnKeyType}
            onSubmitEditing={onSubmitEditing}
            blurOnSubmit={returnKeyType === "done"}
          />
          {rightAction}
        </View>
        {hint && !error && (
          <Text
            style={{
              fontSize: 11,
              fontFamily: fonts.bodyRegular,
              color: isDark ? "hsl(220,5%,42%)" : "hsl(220,5%,58%)",
              lineHeight: 16,
            }}
          >
            {hint}
          </Text>
        )}
        {error && (
          <Text
            style={{
              fontSize: 11,
              fontFamily: fonts.bodyMedium,
              color: colors.danger,
              lineHeight: 16,
            }}
          >
            {error}
          </Text>
        )}
      </View>
    </View>
  );
});
