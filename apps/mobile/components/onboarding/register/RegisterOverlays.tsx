import { LegalModal, LegalSection } from "@/components/ui/LegalModal";
import React from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";

type RegisterOverlaysProps = {
  showTerms: boolean;
  showPrivacy: boolean;
  dropdownOpen: "team" | "level" | null;
  dropdownTop: number;
  dropdownLeft: number;
  dropdownWidth: number;
  dropdownMaxHeight: number;
  dropdownOptions: string[];
  onCloseTerms: () => void;
  onClosePrivacy: () => void;
  onCloseDropdown: () => void;
  onPickDropdownOption: (option: string) => void;
};

export function RegisterOverlays({
  showTerms,
  showPrivacy,
  dropdownOpen,
  dropdownTop,
  dropdownLeft,
  dropdownWidth,
  dropdownMaxHeight,
  dropdownOptions,
  onCloseTerms,
  onClosePrivacy,
  onCloseDropdown,
  onPickDropdownOption,
}: RegisterOverlaysProps) {
  return (
    <>
      <LegalModal visible={showTerms} onClose={onCloseTerms} title="Terms of Service">
        <View className="mb-6">
          <Text className="text-base font-outfit text-secondary mb-4">Last updated: February 05, 2024</Text>
          <Text className="text-base font-outfit text-secondary">
            By accessing or using the PHP Coaching application, you agree to be bound by these Terms of Service.
          </Text>
        </View>
        <LegalSection title="1. Agreement to Terms" content="By accessing or using the PHP Coaching application, you agree to be bound by these Terms of Service. If you do not agree, please do not use the app." />
        <LegalSection title="2. Eligibility" content="The app is designed for athletes and their guardians. Guardians are responsible for the management of minor accounts and all coaching bookings." />
        <LegalSection title="3. Coaching & Subscriptions" content="Subscriptions provide access to specific training tiers (PHP, Plus, Premium). Features and availability may vary based on your selected plan." />
        <LegalSection title="4. Safety & Liability" content="Physical training involves inherent risks. Users must ensure they are in proper physical condition before proceeding with any training program provided." />
        <LegalSection title="5. Termination" content="We reserve the right to suspend or terminate accounts that violate our community guidelines or fail to maintain valid subscriptions." />
      </LegalModal>

      <LegalModal visible={showPrivacy} onClose={onClosePrivacy} title="Privacy Policy">
        <View className="mb-6">
          <Text className="text-base font-outfit text-secondary mb-4">Last updated: February 05, 2024</Text>
          <Text className="text-base font-outfit text-secondary">
            Your privacy is important to us. This policy outlines how we collect, use, and protect your data.
          </Text>
        </View>
        <LegalSection title="1. Data We Collect" content="We collect personal information such as name, email, and training progress to provide a personalized coaching experience. For minor athletes, we only collect data with guardian consent." />
        <LegalSection title="2. How We Use Data" content="Your data is used to track athletic progress, manage schedules, and communicate important updates. We do not sell your personal information to third parties." />
        <LegalSection title="3. Storage & Security" content="We implement industry-standard security measures to protect your data. All sensitive communications and payments are encrypted." />
        <LegalSection title="4. Your Rights" content="You have the right to access, correct, or delete your personal data at any time through the Privacy & Security settings or by contacting support." />
        <LegalSection title="5. Policy Updates" content="We may update this policy occasionally. Continued use of the app after changes constitutes acceptance of the new terms." />
      </LegalModal>

      <Modal transparent animationType="fade" visible={dropdownOpen !== null} onRequestClose={onCloseDropdown}>
        <Pressable className="flex-1 bg-transparent" onPress={onCloseDropdown}>
          {dropdownOpen ? (
            <Pressable className="absolute" style={{ top: dropdownTop, left: dropdownLeft, width: dropdownWidth }} onPress={() => {}}>
              <View className="bg-input rounded-2xl border border-border shadow-xl overflow-hidden">
                <ScrollView style={{ maxHeight: dropdownMaxHeight }}>
                  <View className="gap-2 px-3 py-3">
                    {dropdownOptions.map((option) => (
                      <Pressable key={`dropdown-${dropdownOpen}-${option}`} onPress={() => onPickDropdownOption(option)} className="rounded-xl bg-secondary/40 px-4 py-3">
                        <Text className="text-app font-outfit text-sm">{option}</Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              </View>
            </Pressable>
          ) : null}
        </Pressable>
      </Modal>
    </>
  );
}
