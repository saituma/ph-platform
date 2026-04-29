import React, { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  ActivityIndicator,
  Switch,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useAppSelector } from "@/store/hooks";
import { ReplaceOnce } from "@/components/navigation/ReplaceOnce";
import { createAthlete } from "@/services/teamManager/rosterService";

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
  const [addedName, setAddedName] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const usernameRef = useRef<TextInput>(null);
  const ageRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  if (appRole !== "team_manager") {
    return <ReplaceOnce href="/(tabs)" />;
  }

  const screenBg = isDark ? colors.background : "#F4F6F8";
  const cardBg = isDark ? "hsl(220,8%,13%)" : "#fff";
  const cardBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.07)";
  const inputBg = isDark ? "hsl(220,8%,17%)" : "#F7F9FB";
  const inputBorder = isDark ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.08)";
  const labelColor = isDark ? "hsl(220,5%,50%)" : "hsl(220,5%,46%)";

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
      setAddedName(name.trim());
      setSuccess(true);
      setTimeout(() => {
        if (router.canGoBack()) router.back();
        else router.replace("/team-manager/roster");
      }, 1800);
    } catch (e) {
      setServerError(e instanceof Error ? e.message : "Failed to add athlete. Please try again.");
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
    setAddedName("");
    setErrors({});
    setServerError(null);
  }

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: screenBg }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      {/* ── Nav bar ── */}
      <View
        style={[
          styles.navbar,
          {
            paddingTop: insets.top + 10,
            backgroundColor: screenBg,
            borderBottomColor: cardBorder,
          },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          accessibilityLabel="Go back"
          style={({ pressed }) => [
            styles.backBtn,
            {
              backgroundColor: pressed
                ? isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"
                : cardBg,
              borderColor: cardBorder,
            },
          ]}
        >
          <Ionicons
            name="chevron-back"
            size={19}
            color={isDark ? "hsl(220,5%,72%)" : "hsl(220,8%,28%)"}
          />
        </Pressable>
        <Text
          style={[
            styles.navTitle,
            { color: isDark ? "hsl(220,5%,94%)" : "hsl(220,8%,8%)" },
          ]}
        >
          Add Athlete
        </Text>
        <View style={styles.navSpacer} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 24 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {success ? (
          /* ── Success State ── */
          <Animated.View
            entering={FadeIn.duration(300)}
            style={[styles.successCard, { borderColor: colors.borderLime, backgroundColor: isDark ? "rgba(52,199,89,0.07)" : "rgba(22,163,74,0.05)" }]}
          >
            <View style={[styles.successIcon, { backgroundColor: isDark ? "rgba(52,199,89,0.18)" : "rgba(22,163,74,0.14)" }]}>
              <Ionicons name="checkmark" size={32} color={colors.accent} />
            </View>
            <Text style={[styles.successTitle, { color: isDark ? "hsl(220,5%,94%)" : "hsl(220,8%,8%)" }]}>
              {addedName} added!
            </Text>
            <Text style={[styles.successSub, { color: labelColor }]}>
              The athlete has been added to your team.
            </Text>
            <Pressable
              onPress={handleAddAnother}
              style={({ pressed }) => [
                styles.addAnotherBtn,
                { borderColor: colors.accent, opacity: pressed ? 0.72 : 1 },
              ]}
            >
              <Ionicons name="person-add-outline" size={15} color={colors.accent} />
              <Text style={[styles.addAnotherBtnText, { color: colors.accent }]}>
                Add another athlete
              </Text>
            </Pressable>
          </Animated.View>
        ) : (
          <Animated.View entering={FadeInDown.duration(280)} style={styles.formWrap}>

            {/* ── Hero section ── */}
            <View style={styles.hero}>
              <View
                style={[
                  styles.heroIconWrap,
                  { backgroundColor: isDark ? `${colors.accent}18` : `${colors.accent}14` },
                ]}
              >
                <Ionicons name="person-add" size={28} color={colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.heroTitle,
                    { color: isDark ? "hsl(220,5%,94%)" : "hsl(220,8%,8%)" },
                  ]}
                >
                  New Athlete
                </Text>
                <Text style={[styles.heroSub, { color: labelColor }]}>
                  Fill in the details to add a team member
                </Text>
              </View>
            </View>

            {/* ── Server error ── */}
            {serverError && (
              <View
                style={[
                  styles.errorBanner,
                  {
                    borderColor: isDark ? "rgba(255,107,107,0.3)" : "rgba(239,68,68,0.2)",
                    backgroundColor: isDark ? "rgba(255,107,107,0.08)" : "rgba(239,68,68,0.06)",
                  },
                ]}
              >
                <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
                <Text style={[styles.errorBannerText, { color: colors.danger }]}>
                  {serverError}
                </Text>
              </View>
            )}

            {/* ── Athlete Info card ── */}
            <View style={[styles.sectionCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
              <Text style={[styles.sectionLabel, { color: labelColor }]}>ATHLETE INFO</Text>

              <Field
                label="Full Name"
                value={name}
                onChangeText={(v) => {
                  setName(v);
                  if (errors.name) setErrors((p) => ({ ...p, name: "" }));
                }}
                placeholder="e.g. Jordan Smith"
                error={errors.name}
                inputBg={inputBg}
                inputBorder={errors.name ? (isDark ? "rgba(255,107,107,0.5)" : "rgba(239,68,68,0.4)") : inputBorder}
                isDark={isDark}
                returnKeyType="next"
                onSubmitEditing={() => usernameRef.current?.focus()}
              />

              <Divider isDark={isDark} />

              <Field
                ref={usernameRef}
                label="Username"
                hint="No spaces. Used to log in."
                value={username}
                onChangeText={(v) => {
                  setUsername(v.replace(/\s/g, ""));
                  if (errors.username) setErrors((p) => ({ ...p, username: "" }));
                }}
                placeholder="e.g. jordan_smith"
                error={errors.username}
                inputBg={inputBg}
                inputBorder={errors.username ? (isDark ? "rgba(255,107,107,0.5)" : "rgba(239,68,68,0.4)") : inputBorder}
                isDark={isDark}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={() => ageRef.current?.focus()}
              />

              <Divider isDark={isDark} />

              <Field
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
                inputBorder={errors.age ? (isDark ? "rgba(255,107,107,0.5)" : "rgba(239,68,68,0.4)") : inputBorder}
                isDark={isDark}
                keyboardType="number-pad"
                returnKeyType="done"
              />
            </View>

            {/* ── Password card ── */}
            <View style={[styles.sectionCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
              <View style={styles.passwordToggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.passwordToggleTitle, { color: isDark ? "hsl(220,5%,88%)" : "hsl(220,8%,14%)" }]}>
                    Custom Password
                  </Text>
                  <Text style={[styles.passwordToggleSub, { color: labelColor }]}>
                    If not set, athlete creates one on first login
                  </Text>
                </View>
                <Switch
                  value={showPasswordField}
                  onValueChange={setShowPasswordField}
                  trackColor={{
                    false: isDark ? "hsl(220,8%,25%)" : "hsl(220,5%,80%)",
                    true: colors.accent,
                  }}
                  thumbColor={showPasswordField ? "#fff" : isDark ? "hsl(220,5%,60%)" : "#fff"}
                />
              </View>

              {showPasswordField && (
                <>
                  <Divider isDark={isDark} />
                  <Field
                    ref={passwordRef}
                    label="Password"
                    hint="8–20 chars · uppercase · lowercase · number · symbol"
                    value={customPassword}
                    onChangeText={(v) => {
                      setCustomPassword(v);
                      if (errors.customPassword) setErrors((p) => ({ ...p, customPassword: "" }));
                    }}
                    placeholder="Enter password"
                    error={errors.customPassword}
                    inputBg={inputBg}
                    inputBorder={errors.customPassword ? (isDark ? "rgba(255,107,107,0.5)" : "rgba(239,68,68,0.4)") : inputBorder}
                    isDark={isDark}
                    secureTextEntry={!showPassword}
                    returnKeyType="done"
                    rightAction={
                      <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
                        <Ionicons
                          name={showPassword ? "eye-off-outline" : "eye-outline"}
                          size={18}
                          color={labelColor}
                        />
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
          style={[
            styles.stickyFooter,
            {
              paddingBottom: insets.bottom + 12,
              backgroundColor: screenBg,
              borderTopColor: cardBorder,
            },
          ]}
        >
          <Pressable
            onPress={handleSubmit}
            disabled={submitting}
            accessibilityLabel="Add athlete"
            android_ripple={{ color: "rgba(255,255,255,0.25)", borderless: false }}
            style={({ pressed }) => ({
              borderRadius: 18,
              overflow: "hidden",
              opacity: submitting ? 0.6 : pressed ? 0.86 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            })}
          >
            <View style={styles.submitBtn}>
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="person-add-outline" size={18} color="#fff" />
                  <Text style={styles.submitBtnText}>Add Athlete</Text>
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
    inputBg: string;
    inputBorder: string;
    isDark: boolean;
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
    inputBg,
    inputBorder,
    isDark,
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
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: isDark ? "hsl(220,5%,52%)" : "hsl(220,5%,44%)" }]}>
        {label}
      </Text>
      <View
        style={[
          styles.fieldInputRow,
          { backgroundColor: inputBg, borderColor: inputBorder },
        ]}
      >
        <TextInput
          ref={ref}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={isDark ? "hsl(220,5%,36%)" : "hsl(220,5%,64%)"}
          style={[
            styles.fieldInput,
            { color: isDark ? "hsl(220,5%,92%)" : "hsl(220,8%,10%)" },
          ]}
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
        <Text style={[styles.fieldHint, { color: isDark ? "hsl(220,5%,40%)" : "hsl(220,5%,58%)" }]}>
          {hint}
        </Text>
      )}
      {error && (
        <Text style={styles.fieldError}>{error}</Text>
      )}
    </View>
  );
});

// ── Divider ───────────────────────────────────────────────────────────────────

function Divider({ isDark }: { isDark: boolean }) {
  return (
    <View
      style={[
        styles.divider,
        { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)" },
      ]}
    />
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  navbar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  navTitle: {
    flex: 1,
    fontSize: 17,
    fontFamily: "Outfit-SemiBold",
    letterSpacing: -0.2,
  },
  navSpacer: {
    width: 38,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  formWrap: {
    gap: 16,
  },
  // Hero
  hero: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 4,
  },
  heroIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: {
    fontSize: 22,
    fontFamily: "Chillax-Semibold",
    letterSpacing: -0.4,
  },
  heroSub: {
    fontSize: 13,
    fontFamily: "Outfit-Regular",
    marginTop: 2,
    lineHeight: 18,
  },
  // Error banner
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Outfit-Regular",
    lineHeight: 18,
  },
  // Section card
  sectionCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Outfit-Bold",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 4,
  },
  // Field
  field: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 8,
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: "Outfit-SemiBold",
    letterSpacing: 0.2,
  },
  fieldInputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 8,
  },
  fieldInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Outfit-Regular",
    padding: 0,
  },
  fieldHint: {
    fontSize: 11,
    fontFamily: "Outfit-Regular",
    lineHeight: 16,
  },
  fieldError: {
    fontSize: 11,
    fontFamily: "Outfit-Medium",
    color: "hsl(0,60%,55%)",
    lineHeight: 16,
  },
  divider: {
    height: 1,
    marginHorizontal: 18,
  },
  // Password toggle
  passwordToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 12,
  },
  passwordToggleTitle: {
    fontSize: 15,
    fontFamily: "Outfit-SemiBold",
  },
  passwordToggleSub: {
    fontSize: 12,
    fontFamily: "Outfit-Regular",
    marginTop: 2,
    lineHeight: 17,
  },
  // Sticky footer
  stickyFooter: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  // Submit
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    borderRadius: 18,
    paddingVertical: 17,
    backgroundColor: "#22c55e",
  },
  submitBtnText: {
    fontSize: 16,
    fontFamily: "Outfit-Bold",
    color: "#fff",
    letterSpacing: 0.1,
  },
  // Success
  successCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 36,
    alignItems: "center",
    gap: 10,
  },
  successIcon: {
    width: 68,
    height: 68,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  successTitle: {
    fontSize: 22,
    fontFamily: "Chillax-Semibold",
    textAlign: "center",
    letterSpacing: -0.3,
  },
  successSub: {
    fontSize: 14,
    fontFamily: "Outfit-Regular",
    textAlign: "center",
    lineHeight: 21,
  },
  addAnotherBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 10,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 22,
    borderWidth: 1.5,
  },
  addAnotherBtnText: {
    fontSize: 14,
    fontFamily: "Outfit-SemiBold",
  },
});
