import { useState, useCallback } from "react";
import { PlanPricing } from "@/lib/billing";
import { PlanDetail } from "@/types/billing";
import * as programsService from "@/services/programs/programsService";
import { mapPublicPlans } from "@/lib/programs/programMapper";

export function useProgramPlans() {
  const [plansByTier, setPlansByTier] = useState<Record<string, number>>({});
  const [planDetailsByTier, setPlanDetailsByTier] = useState<Record<string, PlanDetail>>({});
  const [pricingByTier, setPricingByTier] = useState<Record<string, PlanPricing>>({});
  const [isLoading, setIsLoading] = useState(false);

  const loadPlans = useCallback(async (forceRefresh = true) => {
    setIsLoading(true);
    try {
      const res = await programsService.fetchPublicPlans(forceRefresh);
      const { plansByTier, planDetailsByTier, pricingByTier } = mapPublicPlans(res?.plans ?? []);

      setPlansByTier(plansByTier);
      setPlanDetailsByTier(planDetailsByTier);
      setPricingByTier(pricingByTier);
    } catch {
      // silent fail
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { plansByTier, planDetailsByTier, pricingByTier, isLoading, loadPlans };
}
