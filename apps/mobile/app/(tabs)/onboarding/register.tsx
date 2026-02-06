import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Checkbox } from "@/components/ui/checkbox";
import { LegalModal, LegalSection } from "@/components/ui/LegalModal";
import { useRole } from "@/context/RoleContext";
import { Feather } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Pressable, Text, TextInput, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { SafeAreaView } from "react-native-safe-area-context";
import * as z from "zod";

const athleteRegisterSchema = z.object({
  name: z.string().min(2, "Name is required"),
  age: z.string().min(1, "Age is required"),
  team: z.string().min(1, "Team is required"),
  trainingDaysPerWeek: z.string().min(1, "Training days is required"),
  injuries: z.string().min(1, "Injuries is required"),
  growthNotes: z.string().optional(),
  performanceGoals: z.string().min(1, "Performance goals is required"),
  equipmentAccess: z.string().min(1, "Equipment access is required"),
  isChecked: z.boolean().refine((val) => val === true, {
    message: "You must accept the terms and privacy policy",
  }),
});

type AthleteRegisterFormData = z.infer<typeof athleteRegisterSchema>;

export default function RegisterScreen() {
  const router = useRouter();
  const { isDark } = useAppTheme();
  const { setRole } = useRole();
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<AthleteRegisterFormData>({
    resolver: zodResolver(athleteRegisterSchema),
    defaultValues: {
      name: "",
      age: "",
      team: "",
      trainingDaysPerWeek: "",
      injuries: "",
      growthNotes: "",
      performanceGoals: "",
      equipmentAccess: "",
      isChecked: false,
    },
    mode: "onChange",
  });

  const onSubmit = (data: AthleteRegisterFormData) => {
    console.log("Athlete Registration submitted:", data);
    setRole("Guardian");
    try {
      router.replace("/(tabs)");
    } catch (error) {
      console.error("Navigation error:", error);
    }
  };

  const onError = (errors: any) => {
    console.log("Registration form errors:", errors);
  };

  return (
    <SafeAreaView className="flex-1 bg-app">
      <View className="px-6 pt-4 mb-4">
        <Pressable
          onPress={() => router.navigate("/(tabs)/onboarding")}
          className="p-2 -ml-2 self-start"
        >
          <Feather
            name="arrow-left"
            size={24}
            color={isDark ? "#94a3b8" : "#64748b"}
          />
        </Pressable>
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 24,
          paddingBottom: 40,
        }}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
      >
        <View className="mb-8">
          <Text className="text-4xl font-clash text-app mb-2">
            Athlete Profile
          </Text>
          <Text className="text-base font-outfit text-secondary">
            Enter your child's details to personalize their training plan.
          </Text>
        </View>

        <View className="gap-4 mb-8">
          <View>
            <View
              className={`flex-row items-center bg-input border ${errors.name ? "border-red-500" : "border-app"} rounded-xl px-4 h-14`}
            >
              <Feather
                name="user"
                size={20}
                color={errors.name ? "#ef4444" : isDark ? "#94a3b8" : "#64748b"}
              />
              <Controller
                control={control}
                name="name"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    className="flex-1 ml-3 text-app text-base font-outfit"
                    placeholder="Athlete Name"
                    placeholderTextColor="#94a3b8"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    autoCapitalize="words"
                  />
                )}
              />
            </View>
            {errors.name && (
              <Text className="text-red-500 text-xs font-outfit ml-2 mt-1">
                {errors.name.message}
              </Text>
            )}
          </View>

          <View>
            <View
              className={`flex-row items-center bg-input border ${errors.age ? "border-red-500" : "border-app"} rounded-xl px-4 h-14`}
            >
              <Feather
                name="calendar"
                size={20}
                color={errors.age ? "#ef4444" : isDark ? "#94a3b8" : "#64748b"}
              />
              <Controller
                control={control}
                name="age"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    className="flex-1 ml-3 text-app text-base font-outfit"
                    placeholder="Age"
                    placeholderTextColor="#94a3b8"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    keyboardType="numeric"
                  />
                )}
              />
            </View>
            {errors.age && (
              <Text className="text-red-500 text-xs font-outfit ml-2 mt-1">
                {errors.age.message}
              </Text>
            )}
          </View>

          <View>
            <View
              className={`flex-row items-center bg-input border ${errors.team ? "border-red-500" : "border-app"} rounded-xl px-4 h-14`}
            >
              <Feather
                name="users"
                size={20}
                color={errors.team ? "#ef4444" : isDark ? "#94a3b8" : "#64748b"}
              />
              <Controller
                control={control}
                name="team"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    className="flex-1 ml-3 text-app text-base font-outfit"
                    placeholder="Team and Level"
                    placeholderTextColor="#94a3b8"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                )}
              />
            </View>
            {errors.team && (
              <Text className="text-red-500 text-xs font-outfit ml-2 mt-1">
                {errors.team.message}
              </Text>
            )}
          </View>

          <View>
            <View
              className={`flex-row items-center bg-input border ${errors.trainingDaysPerWeek ? "border-red-500" : "border-app"} rounded-xl px-4 h-14`}
            >
              <Feather
                name="activity"
                size={20}
                color={
                  errors.trainingDaysPerWeek
                    ? "#ef4444"
                    : isDark
                      ? "#94a3b8"
                      : "#64748b"
                }
              />
              <Controller
                control={control}
                name="trainingDaysPerWeek"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    className="flex-1 ml-3 text-app text-base font-outfit"
                    placeholder="Training days per week"
                    placeholderTextColor="#94a3b8"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    keyboardType="numeric"
                  />
                )}
              />
            </View>
            {errors.trainingDaysPerWeek && (
              <Text className="text-red-500 text-xs font-outfit ml-2 mt-1">
                {errors.trainingDaysPerWeek.message}
              </Text>
            )}
          </View>

          <View>
            <View
              className={`flex-row items-center bg-input border ${errors.injuries ? "border-red-500" : "border-app"} rounded-xl px-4 h-14`}
            >
              <Feather
                name="alert-circle"
                size={20}
                color={
                  errors.injuries ? "#ef4444" : isDark ? "#94a3b8" : "#64748b"
                }
              />
              <Controller
                control={control}
                name="injuries"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    className="flex-1 ml-3 text-app text-base font-outfit"
                    placeholder="Current or previous injuries"
                    placeholderTextColor="#94a3b8"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                )}
              />
            </View>
            {errors.injuries && (
              <Text className="text-red-500 text-xs font-outfit ml-2 mt-1">
                {errors.injuries.message}
              </Text>
            )}
          </View>

          <View className="flex-row items-start pt-4 bg-input border border-app rounded-xl px-4 min-h-[56px] h-auto">
            <Feather
              name="file-text"
              size={20}
              color={isDark ? "#94a3b8" : "#64748b"}
              style={{ marginTop: 2 }}
            />
            <Controller
              control={control}
              name="growthNotes"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  className="flex-1 ml-3 text-app text-base font-outfit leading-5"
                  placeholder="Growth notes (optional)"
                  placeholderTextColor="#94a3b8"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  multiline
                  numberOfLines={3}
                  style={{ textAlignVertical: "top" }}
                />
              )}
            />
          </View>

          <View>
            <View
              className={`flex-row items-start pt-4 bg-input border ${errors.performanceGoals ? "border-red-500" : "border-app"} rounded-xl px-4 min-h-[56px] h-auto`}
            >
              <Feather
                name="target"
                size={20}
                color={
                  errors.performanceGoals
                    ? "#ef4444"
                    : isDark
                      ? "#94a3b8"
                      : "#64748b"
                }
                style={{ marginTop: 2 }}
              />
              <Controller
                control={control}
                name="performanceGoals"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    className="flex-1 ml-3 text-app text-base font-outfit leading-5"
                    placeholder="Performance goals"
                    placeholderTextColor="#94a3b8"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    multiline
                    numberOfLines={3}
                    style={{ textAlignVertical: "top" }}
                  />
                )}
              />
            </View>
            {errors.performanceGoals && (
              <Text className="text-red-500 text-xs font-outfit ml-2 mt-1">
                {errors.performanceGoals.message}
              </Text>
            )}
          </View>

          <View>
            <View
              className={`flex-row items-center bg-input border ${errors.equipmentAccess ? "border-red-500" : "border-app"} rounded-xl px-4 h-14`}
            >
              <Feather
                name="tool"
                size={20}
                color={
                  errors.equipmentAccess
                    ? "#ef4444"
                    : isDark
                      ? "#94a3b8"
                      : "#64748b"
                }
              />
              <Controller
                control={control}
                name="equipmentAccess"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    className="flex-1 ml-3 text-app text-base font-outfit"
                    placeholder="Equipment access"
                    placeholderTextColor="#94a3b8"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                )}
              />
            </View>
            {errors.equipmentAccess && (
              <Text className="text-red-500 text-xs font-outfit ml-2 mt-1">
                {errors.equipmentAccess.message}
              </Text>
            )}
          </View>

          <Controller
            control={control}
            name="isChecked"
            render={({ field: { onChange, value } }) => (
              <Checkbox
                checked={value}
                onChange={onChange}
                label={
                  <Text className="text-app font-outfit text-base">
                    I agree to the{" "}
                    <Text
                      onPress={() => setShowTerms(true)}
                      className="text-accent font-bold"
                    >
                      Terms of Service
                    </Text>{" "}
                    and{" "}
                    <Text
                      onPress={() => setShowPrivacy(true)}
                      className="text-accent font-bold"
                    >
                      Privacy Policy
                    </Text>
                  </Text>
                }
                error={errors.isChecked?.message}
              />
            )}
          />
        </View>

        <Pressable
          onPress={handleSubmit(onSubmit, onError)}
          className="bg-accent h-14 rounded-xl items-center justify-center mb-8 w-full"
        >
          <Text className="text-white font-bold text-lg font-outfit">
            Complete Registration
          </Text>
        </Pressable>
      </KeyboardAwareScrollView>

      <LegalModal
        visible={showTerms}
        onClose={() => setShowTerms(false)}
        title="Terms of Service"
      >
        <View className="mb-6">
          <Text className="text-base font-outfit text-secondary mb-4">
            Last updated: February 05, 2024
          </Text>
          <Text className="text-base font-outfit text-secondary">
            By accessing or using the PHP Coaching application, you agree to be
            bound by these Terms of Service.
          </Text>
        </View>
        <LegalSection
          title="1. Agreement to Terms"
          content="By accessing or using the PHP Coaching application, you agree to be bound by these Terms of Service. If you do not agree, please do not use the app."
        />
        <LegalSection
          title="2. Eligibility"
          content="The app is designed for athletes and their guardians. Guardians are responsible for the management of minor accounts and all coaching bookings."
        />
        <LegalSection
          title="3. Coaching & Subscriptions"
          content="Subscriptions provide access to specific training tiers (PHP, Plus, Premium). Features and availability may vary based on your selected plan."
        />
        <LegalSection
          title="4. Safety & Liability"
          content="Physical training involves inherent risks. Users must ensure they are in proper physical condition before proceeding with any training program provided."
        />
        <LegalSection
          title="5. Termination"
          content="We reserve the right to suspend or terminate accounts that violate our community guidelines or fail to maintain valid subscriptions."
        />
      </LegalModal>

      <LegalModal
        visible={showPrivacy}
        onClose={() => setShowPrivacy(false)}
        title="Privacy Policy"
      >
        <View className="mb-6">
          <Text className="text-base font-outfit text-secondary mb-4">
            Last updated: February 05, 2024
          </Text>
          <Text className="text-base font-outfit text-secondary">
            Your privacy is important to us. This policy outlines how we
            collect, use, and protect your data.
          </Text>
        </View>
        <LegalSection
          title="1. Data We Collect"
          content="We collect personal information such as name, email, and training progress to provide a personalized coaching experience. For minor athletes, we only collect data with guardian consent."
        />
        <LegalSection
          title="2. How We Use Data"
          content="Your data is used to track athletic progress, manage schedules, and communicate important updates. We do not sell your personal information to third parties."
        />
        <LegalSection
          title="3. Storage & Security"
          content="We implement industry-standard security measures to protect your data. All sensitive communications and payments are encrypted."
        />
        <LegalSection
          title="4. Your Rights"
          content="You have the right to access, correct, or delete your personal data at any time through the Privacy & Security settings or by contacting support."
        />
        <LegalSection
          title="5. Policy Updates"
          content="We may update this policy occasionally. Continued use of the app after changes constitutes acceptance of the new terms."
        />
      </LegalModal>
    </SafeAreaView>
  );
}
