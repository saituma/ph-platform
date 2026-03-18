import { Stack, Transition } from "@/components/navigation/TransitionStack";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        ...Transition.Presets.SlideFromBottom(),
      }}
    />
  );
}
