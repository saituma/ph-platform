import { useState, useCallback } from "react";
import { Alert } from "react-native";
import { apiRequest } from "@/lib/api";
import { useAppDispatch } from "@/store/hooks";
import { setLatestSubscriptionRequest, setProgramTier } from "@/store/slices/userSlice";
import { initPaymentSheet, presentPaymentSheet } from "@stripe/stripe-react-native";
import { SubscriptionRequest } from "@/types/billing";

export function useBillingManager(token: string | null) {
  const dispatch = useAppDispatch();
  const [isProcessing, setIsProcessing] = useState(false);

  const refreshStatus = useCallback(async () => {
    if (!token) return;
    try {
      const status = await apiRequest<{
        currentProgramTier?: string | null;
        latestRequest?: SubscriptionRequest | null;
      }>("/billing/status", {
        token,
        suppressStatusCodes: [401, 403, 404],
        skipCache: true,
      });
      const req = status?.latestRequest ?? null;
      const nextTier = status?.currentProgramTier ?? (req?.status === "approved" ? (req?.planTier ?? null) : null);
      
      dispatch(setProgramTier(nextTier));
      dispatch(setLatestSubscriptionRequest(req));
      return { currentProgramTier: nextTier, latestRequest: req };
    } catch {
      return null;
    }
  }, [dispatch, token]);

  const processPayment = useCallback(async (planId: number) => {
    if (!token) return;
    setIsProcessing(true);
    try {
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
      
      if (init.error) throw new Error(init.error.message);

      const result = await presentPaymentSheet();
      if (result.error) throw new Error(result.error.message);

      const confirm = await apiRequest<{ request?: any }>("/billing/payment-sheet/confirm", {
        method: "POST",
        body: { paymentIntentId: data.paymentIntentId },
        token,
      });

      dispatch(setLatestSubscriptionRequest(confirm.request ?? data.request ?? null));
      await refreshStatus();
    } catch (e: any) {
      Alert.alert("Payment failed", e?.message || "Failed to start checkout.");
    } finally {
      setIsProcessing(false);
    }
  }, [dispatch, token, refreshStatus]);

  return { refreshStatus, processPayment, isProcessing };
}
