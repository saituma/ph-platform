import React, { useCallback, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
  ActivityIndicator,
  Switch,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { router } from "expo-router";
import {
  ChevronLeft,
  UserPlus,
  AlertCircle,
  Check,
  Eye,
  EyeOff,
  Copy,
  CheckCheck,
} from "lucide-react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { Text } from "@/components/ScaledText";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useAppSelector } from "@/store/hooks";
import { ReplaceOnce } from "@/components/navigation/ReplaceOnce";
import { createAthlete, type CreateAthleteResult } from "@/services/teamManager/rosterService";

// ─────────────────────────────────────────────────────────────────────────────
// AddAthleteScreen
// ─────────────────────────────────────────────────────────────────────────────

export default function AddAthleteScreen() {
  const p = useAdminPastel();
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
  const [addedName, setAddedName] = useState("");
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null);
  const [copiedField, setCopiedField] = useState<"email" | "password" | "all" | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const usernameRef = useRef<TextInput>(null);
  const ageRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  if (appRole !== "team_manager") {
    return <ReplaceOnce href="/(tabs)" />;
  }

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
          "Password must be 8-20 characters with uppercase, lowercase, number, and symbol.";
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
      const result = await createAthlete(token, {
        name: name.trim(),
        username: username.trim().toLowerCase(),
        age: parseInt(age, 10),
        customPassword: showPasswordField && customPassword ? customPassword : undefined,
      });
      setAddedName(name.trim());
      setCredentials({
        email: result.email,
        password: showPasswordField && customPassword ? customPassword : result.temporaryPassword,
      });
      setSuccess(true);
    } catch (e) {
      setServerError(e instanceof Error ? e.message : "Failed to add athlete. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const copyToClipboard = useCallback(async (text: string, field: "email" | "password" | "all") => {
    await Clipboard.setStringAsync(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }, []);

  function handleAddAnother() {
    setName("");
    setUsername("");
    setAge("");
    setCustomPassword("");
    setShowPasswordField(false);
    setSuccess(false);
    setAddedName("");
    setCredentials(null);
    setCopiedField(null);
    setErrors({});
    setServerError(null);
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: p.pageBg }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      {/* ── Nav bar ── */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingBottom: 12,
          paddingTop: insets.top + 10,
          backgroundColor: p.pageBg,
          borderBottomWidth: 1,
          borderBottomColor: p.divider,
          gap: 12,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          accessibilityLabel="Go back"
          style={({ pressed }) => ({
            width: 38,
            height: 38,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: pressed ? p.accentSoft : p.cardWhite,
          })}
        >
          <ChevronLeft size={19} color={p.textSecondary} />
        </Pressable>
        <Text
          style={{
            flex: 1,
            fontSize: 17,
            fontFamily: "Outfit-Bold",
            letterSpacing: -0.2,
            color: p.textPrimary,
          }}
        >
          Add Athlete
        </Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {success ? (
          /* ── Success State ── */
          <Animated.View entering={FadeIn.duration(300)} style={{ gap: 16 }}>
            {/* Success header */}
            <View
              style={{
                borderRadius: 22,
                backgroundColor: p.successSoft,
                padding: 28,
                alignItems: "center",
                gap: 10,
              }}
            >
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 18,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: p.accent + "18",
                }}
              >
                <Check size={28} color={p.accent} />
              </View>
              <Text
                style={{
                  fontSize: 22,
                  fontFamily: "Outfit-Bold",
                  textAlign: "center",
                  letterSpacing: -0.3,
                  color: p.textPrimary,
                }}
              >
                {addedName} added!
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  fontFamily: "Outfit-Regular",
                  textAlign: "center",
                  lineHeight: 21,
                  color: p.textSecondary,
                }}
              >
                Share these login details with the athlete.
              </Text>
            </View>

            {/* Credentials card */}
            {credentials && (
              <View
                style={{
                  borderRadius: 22,
                  backgroundColor: p.cardWhite,
                  overflow: "hidden",
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontFamily: "Outfit-Bold",
                    letterSpacing: 0.8,
                    textTransform: "uppercase",
                    paddingHorizontal: 18,
                    paddingTop: 16,
                    paddingBottom: 4,
                    color: p.textMuted,
                  }}
                >
                  LOGIN CREDENTIALS
                </Text>

                {/* Email */}
                <View style={{ paddingHorizontal: 18, paddingVertical: 14, gap: 6 }}>
                  <Text style={{ fontSize: 12, fontFamily: "Outfit-Bold", letterSpacing: 0.2, color: p.textMuted }}>
                    Email
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View
                      style={{
                        flex: 1,
                        borderRadius: 12,
                        backgroundColor: p.inputBg,
                        paddingHorizontal: 14,
                        paddingVertical: 12,
                      }}
                    >
                      <Text
                        selectable
                        style={{ fontSize: 14, fontFamily: "Outfit-Regular", color: p.textPrimary }}
                      >
                        {credentials.email}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => copyToClipboard(credentials.email, "email")}
                      style={({ pressed }) => ({
                        width: 42,
                        height: 42,
                        borderRadius: 12,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: copiedField === "email" ? p.successSoft : p.accentSoft,
                        opacity: pressed ? 0.7 : 1,
                      })}
                    >
                      {copiedField === "email" ? (
                        <CheckCheck size={18} color={p.accent} />
                      ) : (
                        <Copy size={18} color={p.accent} />
                      )}
                    </Pressable>
                  </View>
                </View>

                <View style={{ height: 1, marginHorizontal: 18, backgroundColor: p.divider }} />

                {/* Password */}
                <View style={{ paddingHorizontal: 18, paddingVertical: 14, gap: 6 }}>
                  <Text style={{ fontSize: 12, fontFamily: "Outfit-Bold", letterSpacing: 0.2, color: p.textMuted }}>
                    Password
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View
                      style={{
                        flex: 1,
                        borderRadius: 12,
                        backgroundColor: p.inputBg,
                        paddingHorizontal: 14,
                        paddingVertical: 12,
                      }}
                    >
                      <Text
                        selectable
                        style={{ fontSize: 14, fontFamily: "Outfit-Regular", color: p.textPrimary }}
                      >
                        {credentials.password}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => copyToClipboard(credentials.password, "password")}
                      style={({ pressed }) => ({
                        width: 42,
                        height: 42,
                        borderRadius: 12,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: copiedField === "password" ? p.successSoft : p.accentSoft,
                        opacity: pressed ? 0.7 : 1,
                      })}
                    >
                      {copiedField === "password" ? (
                        <CheckCheck size={18} color={p.accent} />
                      ) : (
                        <Copy size={18} color={p.accent} />
                      )}
                    </Pressable>
                  </View>
                </View>

                <View style={{ height: 1, marginHorizontal: 18, backgroundColor: p.divider }} />

                {/* Copy all */}
                <Pressable
                  onPress={() =>
                    copyToClipboard(
                      `Email: ${credentials.email}\nPassword: ${credentials.password}`,
                      "all",
                    )
                  }
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    paddingVertical: 14,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  {copiedField === "all" ? (
                    <CheckCheck size={16} color={p.accent} />
                  ) : (
                    <Copy size={16} color={p.accent} />
                  )}
                  <Text style={{ fontSize: 14, fontFamily: "Outfit-Bold", color: p.accent }}>
                    {copiedField === "all" ? "Copied!" : "Copy all credentials"}
                  </Text>
                </Pressable>
              </View>
            )}

            {/* Action buttons */}
            <View style={{ flexDirection: "row", gap: 12 }}>
              <Pressable
                onPress={handleAddAnother}
                style={({ pressed }) => ({
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 7,
                  paddingVertical: 15,
                  borderRadius: 100,
                  backgroundColor: p.accentSoft,
                  opacity: pressed ? 0.72 : 1,
                })}
              >
                <UserPlus size={15} color={p.accent} />
                <Text style={{ fontSize: 14, fontFamily: "Outfit-Bold", color: p.accent }}>
                  Add another
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (router.canGoBack()) router.back();
                  else router.replace("/team-manager/roster");
                }}
                style={({ pressed }) => ({
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 7,
                  paddingVertical: 15,
                  borderRadius: 100,
                  backgroundColor: p.accent,
                  opacity: pressed ? 0.86 : 1,
                })}
              >
                <Text style={{ fontSize: 14, fontFamily: "Outfit-Bold", color: p.buttonPrimaryText }}>
                  Done
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        ) : (
          <Animated.View entering={FadeInDown.duration(280)} style={{ gap: 16 }}>

            {/* ── Hero section ── */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 4 }}>
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 18,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: p.accentSoft,
                }}
              >
                <UserPlus size={28} color={p.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 22,
                    fontFamily: "Outfit-Bold",
                    letterSpacing: -0.4,
                    color: p.textPrimary,
                  }}
                >
                  New Athlete
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    fontFamily: "Outfit-Regular",
                    marginTop: 2,
                    lineHeight: 18,
                    color: p.textSecondary,
                  }}
                >
                  Fill in the details to add a team member
                </Text>
              </View>
            </View>

            {/* ── Server error ── */}
            {serverError && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  borderRadius: 22,
                  backgroundColor: p.dangerSoft,
                  padding: 14,
                }}
              >
                <AlertCircle size={16} color={p.danger} />
                <Text
                  style={{
                    flex: 1,
                    fontSize: 13,
                    fontFamily: "Outfit-Regular",
                    lineHeight: 18,
                    color: p.danger,
                  }}
                >
                  {serverError}
                </Text>
              </View>
            )}

            {/* ── Athlete Info card ── */}
            <View
              style={{
                borderRadius: 22,
                backgroundColor: p.cardWhite,
                overflow: "hidden",
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontFamily: "Outfit-Bold",
                  letterSpacing: 0.8,
                  textTransform: "uppercase",
                  paddingHorizontal: 18,
                  paddingTop: 16,
                  paddingBottom: 4,
                  color: p.textMuted,
                }}
              >
                ATHLETE INFO
              </Text>

              <Field
                label="Full Name"
                value={name}
                onChangeText={(v) => {
                  setName(v);
                  if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
                }}
                placeholder="e.g. Jordan Smith"
                error={errors.name}
                returnKeyType="next"
                onSubmitEditing={() => usernameRef.current?.focus()}
              />

              <Divider />

              <Field
                ref={usernameRef}
                label="Username"
                hint="No spaces. Used to log in."
                value={username}
                onChangeText={(v) => {
                  setUsername(v.replace(/\s/g, ""));
                  if (errors.username) setErrors((prev) => ({ ...prev, username: "" }));
                }}
                placeholder="e.g. jordan_smith"
                error={errors.username}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={() => ageRef.current?.focus()}
              />

              <Divider />

              <Field
                ref={ageRef}
                label="Age"
                value={age}
                onChangeText={(v) => {
                  setAge(v.replace(/[^0-9]/g, ""));
                  if (errors.age) setErrors((prev) => ({ ...prev, age: "" }));
                }}
                placeholder="e.g. 16"
                error={errors.age}
                keyboardType="number-pad"
                returnKeyType="done"
              />
            </View>

            {/* ── Password card ── */}
            <View
              style={{
                borderRadius: 22,
                backgroundColor: p.cardWhite,
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 18,
                  paddingVertical: 16,
                  gap: 12,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 15,
                      fontFamily: "Outfit-Bold",
                      color: p.textPrimary,
                    }}
                  >
                    Custom Password
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      fontFamily: "Outfit-Regular",
                      marginTop: 2,
                      lineHeight: 17,
                      color: p.textSecondary,
                    }}
                  >
                    If not set, athlete creates one on first login
                  </Text>
                </View>
                <Switch
                  value={showPasswordField}
                  onValueChange={setShowPasswordField}
                  trackColor={{
                    false: p.inputBg,
                    true: p.accent,
                  }}
                  thumbColor={showPasswordField ? p.buttonPrimaryText : p.textMuted}
                />
              </View>

              {showPasswordField && (
                <>
                  <Divider />
                  <Field
                    ref={passwordRef}
                    label="Password"
                    hint="8-20 chars - uppercase - lowercase - number - symbol"
                    value={customPassword}
                    onChangeText={(v) => {
                      setCustomPassword(v);
                      if (errors.customPassword) setErrors((prev) => ({ ...prev, customPassword: "" }));
                    }}
                    placeholder="Enter password"
                    error={errors.customPassword}
                    secureTextEntry={!showPassword}
                    returnKeyType="done"
                    rightAction={
                      <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
                        {showPassword ? (
                          <EyeOff size={18} color={p.textMuted} />
                        ) : (
                          <Eye size={18} color={p.textMuted} />
                        )}
                      </Pressable>
                    }
                  />
                </>
              )}
            </View>

          </Animated.View>
        )}
      </ScrollView>

      {/* ── Sticky footer button (hidden on success) ── */}
      {!success && (
        <View
          style={{
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: insets.bottom + 12,
            backgroundColor: p.pageBg,
            borderTopWidth: 1,
            borderTopColor: p.divider,
          }}
        >
          <Pressable
            onPress={handleSubmit}
            disabled={submitting}
            accessibilityLabel="Add athlete"
            android_ripple={{ color: "rgba(255,255,255,0.25)", borderless: false }}
            style={({ pressed }) => ({
              borderRadius: 100,
              overflow: "hidden",
              opacity: submitting ? 0.6 : pressed ? 0.86 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            })}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 9,
                borderRadius: 100,
                paddingVertical: 17,
                backgroundColor: p.accent,
              }}
            >
              {submitting ? (
                <ActivityIndicator color={p.buttonPrimaryText} size="small" />
              ) : (
                <>
                  <UserPlus size={18} color={p.buttonPrimaryText} />
                  <Text
                    style={{
                      fontSize: 16,
                      fontFamily: "Outfit-Bold",
                      color: p.buttonPrimaryText,
                      letterSpacing: 0.1,
                    }}
                  >
                    Add Athlete
                  </Text>
                </>
              )}
            </View>
          </Pressable>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

// ── Field ─────────────────────────────────────────────────────────────────────

const Field = React.forwardRef<
  TextInput,
  {
    label: string;
    value: string;
    onChangeText: (v: string) => void;
    placeholder?: string;
    hint?: string;
    error?: string;
    isFirst?: boolean;
    secureTextEntry?: boolean;
    keyboardType?: "default" | "number-pad" | "email-address";
    autoCapitalize?: "none" | "sentences" | "words" | "characters";
    autoCorrect?: boolean;
    returnKeyType?: "next" | "done" | "go";
    onSubmitEditing?: () => void;
    rightAction?: React.ReactNode;
  }
>(function Field(
  {
    label,
    value,
    onChangeText,
    placeholder,
    hint,
    error,
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
  const p = useAdminPastel();
  const errorBorder = error ? p.dangerSoft : p.inputBorder;

  return (
    <View style={{ paddingHorizontal: 18, paddingVertical: 14, gap: 8 }}>
      <Text
        style={{
          fontSize: 12,
          fontFamily: "Outfit-Bold",
          letterSpacing: 0.2,
          color: p.textMuted,
        }}
      >
        {label}
      </Text>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          borderRadius: 12,
          backgroundColor: p.inputBg,
          borderWidth: 1,
          borderColor: errorBorder,
          paddingHorizontal: 14,
          paddingVertical: 13,
          gap: 8,
        }}
      >
        <TextInput
          ref={ref}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={p.textMuted}
          style={{
            flex: 1,
            fontSize: 15,
            fontFamily: "Outfit-Regular",
            padding: 0,
            color: p.textPrimary,
          }}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          submitBehavior={returnKeyType === "done" ? "blurAndSubmit" : "submit"}
        />
        {rightAction}
      </View>
      {hint && !error && (
        <Text style={{ fontSize: 11, fontFamily: "Outfit-Regular", lineHeight: 16, color: p.textMuted }}>
          {hint}
        </Text>
      )}
      {error && (
        <Text style={{ fontSize: 11, fontFamily: "Outfit-Regular", color: p.danger, lineHeight: 16 }}>
          {error}
        </Text>
      )}
    </View>
  );
});

// ── Divider ───────────────────────────────────────────────────────────────────

function Divider() {
  const p = useAdminPastel();
  return (
    <View
      style={{
        height: 1,
        marginHorizontal: 18,
        backgroundColor: p.divider,
      }}
    />
  );
}
