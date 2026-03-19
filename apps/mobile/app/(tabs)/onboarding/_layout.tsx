import { Stack, slideFromRight } from "@/components/navigation/TransitionStack";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        ...slideFromRight,
      }}
    />
  );
}
