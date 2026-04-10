import { useState, useCallback } from "react";
import { apiRequest } from "@/lib/api";
import { buildPlanPricing, PlanPricing } from "@/lib/billing";
import { PlanDetail } from "@/types/billing";

export function useProgramPlans() {
  const [plansByTier, setPlansByTier] = useState<Record<string, number>>({});
  const [planDetailsByTier, setPlanDetailsByTier] = useState<Record<string, PlanDetail>>({});
  const [pricingByTier, setPricingByTier] = useState<Record<string, PlanPricing>>({});
  const [isLoading, setIsLoading] = useState(false);

  const loadPlans = useCallback(async (forceRefresh = true) => {
    setIsLoading(true);
    try {
      const res = await apiRequest<{ plans: PlanDetail[] }>("/public/plans", { forceRefresh });
      const idMap: Record<string, number> = {};
      const detailMap: Record<string, PlanDetail> = {};
      const pricingMap: Record<string, PlanPricing> = {};

      (res?.plans ?? []).forEach(plan => {
        if (plan?.tier && plan?.id) {
          idMap[plan.tier] = plan.id;
          detailMap[plan.tier] = plan;
          pricingMap[plan.tier] = buildPlanPricing(plan);
        }
      });

      setPlansByTier(idMap);
      setPlanDetailsByTier(detailMap);
      setPricingByTier(pricingMap);
    } catch {
      // silent fail
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { plansByTier, planDetailsByTier, pricingByTier, isLoading, loadPlans };
}
