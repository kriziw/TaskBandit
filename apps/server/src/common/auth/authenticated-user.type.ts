import type { FeatureAccess } from "../tenancy/feature-access.service";

export type AuthenticatedUser = {
  id: string;
  tenantId: string;
  householdId: string;
  displayName: string;
  role: "admin" | "parent" | "child";
  email: string | null;
  points: number;
  currentStreak: number;
  featureAccess: FeatureAccess;
};
