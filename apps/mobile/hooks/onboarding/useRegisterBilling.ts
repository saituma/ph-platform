import { useState, useCallback } from "react";
import { Alert, InteractionManager } from "react-native";
import { apiRequest } from "@/lib/api";
import {
  initPaymentSheet,
  presentPaymentSheet,
} from "@stripe/stripe-react-native";
import { useAppDispatch } from "@/store/hooks";
import { setLatestSubscriptionRequest } from "@/store/slices/userSlice";

export function useRegisterBilling(token: string | null) {
  const [isPaying, setIsPaying] = useState(false);
  const [payingTier, setPayingTier] = useState<string | null>(null);
  const dispatch = useAppDispatch();

  const handlePayPlan = useCallback(
    async (tierKey: string, planId: number, planIsActive: boolean) => {
      if (isPaying) return;
      
      if (!planId) {
        Alert.alert("Plan unavailable", "Pricing is not available right now.");
        return;
      }
      if (planIsActive === false) {
        Alert.alert(
          "Plan locked",
          "This plan is currently inactive and unavailable.",
        );
        return;
      }
      if (!token) {
        Alert.alert(
          "Login required",
          "Please log in as a guardian to purchase a plan.",
        );
        return;
      }

      try {
        setIsPaying(true);
        setPayingTier(tierKey);

        await new Promise<void>((resolve) =>
          InteractionManager.runAfterInteractions(() => resolve()),
        );

        const data = await apiRequest<{
          customerId: string;
          ephemeralKey: string;
          paymentIntentId: string;
          paymentIntentClientSecret: string;
          request?: any;
        }>("/billing/payment-sheet", {
          method: "POST",
          body: { planId, interval: "monthly" },
          token,
        });

        const init = await initPaymentSheet({
          merchantDisplayName: "PH Platform",
          customerId: data.customerId,
          customerEphemeralKeySecret: data.ephemeralKey,
          paymentIntentClientSecret: data.paymentIntentClientSecret,
          allowsDelayedPaymentMethods: true,
        });

        if (init.error) {
          throw new Error(init.error.message);
        }

        const result = await presentPaymentSheet();
        if (result.error) {
          throw new Error(result.error.message);
        }

        const confirm = await apiRequest<{
          paymentStatus?: string;
          request?: any;
        }>("/billing/payment-sheet/confirm", {
          method: "POST",
          body: { paymentIntentId: data.paymentIntentId },
          token,
        });

        dispatch(
          setLatestSubscriptionRequest(confirm.request ?? data.request ?? null),
        );

        Alert.alert(
          "Payment status",
          confirm.paymentStatus === "succeeded" ||
            confirm.paymentStatus === "processing"
            ? "Payment received. Awaiting admin approval."
            : "Payment pending. We will update your plan once confirmed.",
        );
      } catch (error: any) {
        const message = error?.message || "Failed to start checkout.";
        if (typeof message === "string" && message.includes("403")) {
          Alert.alert(
            "Guardian only",
            "Only guardian accounts can purchase plans.",
          );
          return;
        }
        Alert.alert("Payment failed", message);
      } finally {
        setIsPaying(false);
        setPayingTier(null);
      }
    },
    [dispatch, isPaying, token],
  );

  return { isPaying, payingTier, handlePayPlan };
}
