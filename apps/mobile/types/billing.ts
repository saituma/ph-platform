import { ProgramId } from "@/constants/program-details";
import { PlanPricing } from "@/lib/billing";

export type BillingStatus = {
  currentProgramTier: string | null;
  latestRequest: SubscriptionRequest | null;
};

export type SubscriptionRequest = {
  status?: string | null;
  paymentStatus?: string | null;
  planTier?: string | null;
  createdAt?: string | null;
};

export type PlanDetail = {
  id: number;
  tier: string;
  pricing: any;
  isActive?: boolean | null;
  discountValue?: string | number;
  discountType?: string;
  discountAppliesTo?: string;
};

export type TrainingContentV2Workspace = {
  tabs: string[];
  modules: any[];
  others: any[];
};

export interface ProgramTierUI {
  id: ProgramId;
  name: string;
  highlight?: string;
  popular?: boolean;
  icon: string;
  features: string[];
}
