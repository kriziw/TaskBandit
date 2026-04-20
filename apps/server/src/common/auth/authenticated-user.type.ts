export type AuthenticatedUser = {
  id: string;
  tenantId: string;
  householdId: string;
  displayName: string;
  role: "admin" | "parent" | "child";
  email: string | null;
  points: number;
  currentStreak: number;
};
