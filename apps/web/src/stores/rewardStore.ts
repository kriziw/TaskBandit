import { create } from 'zustand';
import type { RewardCategory, RewardEligibility, RewardWorkflowType } from '../types/taskbandit';

export type RewardFormState = {
  title: string;
  description: string;
  category: RewardCategory;
  eligibility: RewardEligibility;
  pointCost: number;
  maxRedemptionsPerChild: string;
  cooldownDays: string;
  workflowType: RewardWorkflowType;
};

const defaultRewardForm = (): RewardFormState => ({
  title: '',
  description: '',
  category: 'CUSTOM',
  eligibility: 'ALL',
  pointCost: 50,
  maxRedemptionsPerChild: '',
  cooldownDays: '',
  workflowType: 'STANDARD',
});

interface RewardStore {
  rewardsTab: 'shop' | 'history';
  rewardsManagerTab: 'catalogue' | 'approvals' | 'my_shop';
  selectedRewardId: string | null;
  isCreatingNewReward: boolean;
  rewardForm: RewardFormState;
  redeemDialogRewardId: string | null;
  redeemTargetDate: string;
  rejectDialogRedemptionId: string | null;
  rejectDialogNote: string;
  showAllPointsLedger: boolean;
  rescheduleRedemptionId: string | null;
  rescheduleTargetDate: string;

  setRewardsTab: (v: 'shop' | 'history') => void;
  setRewardsManagerTab: (v: 'catalogue' | 'approvals' | 'my_shop') => void;
  setSelectedRewardId: (v: string | null) => void;
  setIsCreatingNewReward: (v: boolean) => void;
  setRewardForm: (v: RewardFormState | ((prev: RewardFormState) => RewardFormState)) => void;
  setRedeemDialogRewardId: (v: string | null) => void;
  setRedeemTargetDate: (v: string) => void;
  setRejectDialogRedemptionId: (v: string | null) => void;
  setRejectDialogNote: (v: string) => void;
  setShowAllPointsLedger: (v: boolean) => void;
  setRescheduleRedemptionId: (v: string | null) => void;
  setRescheduleTargetDate: (v: string) => void;

  resetRewardForm: () => void;
}

export const useRewardStore = create<RewardStore>((set) => ({
  rewardsTab: 'shop',
  rewardsManagerTab: 'my_shop',
  selectedRewardId: null,
  isCreatingNewReward: false,
  rewardForm: defaultRewardForm(),
  redeemDialogRewardId: null,
  redeemTargetDate: '',
  rejectDialogRedemptionId: null,
  rejectDialogNote: '',
  showAllPointsLedger: false,
  rescheduleRedemptionId: null,
  rescheduleTargetDate: '',

  setRewardsTab: (v) => set({ rewardsTab: v }),
  setRewardsManagerTab: (v) => set({ rewardsManagerTab: v }),
  setSelectedRewardId: (v) => set({ selectedRewardId: v }),
  setIsCreatingNewReward: (v) => set({ isCreatingNewReward: v }),
  setRewardForm: (v) => set((s) => ({ rewardForm: typeof v === 'function' ? v(s.rewardForm) : v })),
  setRedeemDialogRewardId: (v) => set({ redeemDialogRewardId: v }),
  setRedeemTargetDate: (v) => set({ redeemTargetDate: v }),
  setRejectDialogRedemptionId: (v) => set({ rejectDialogRedemptionId: v }),
  setRejectDialogNote: (v) => set({ rejectDialogNote: v }),
  setShowAllPointsLedger: (v) => set({ showAllPointsLedger: v }),
  setRescheduleRedemptionId: (v) => set({ rescheduleRedemptionId: v }),
  setRescheduleTargetDate: (v) => set({ rescheduleTargetDate: v }),

  resetRewardForm: () =>
    set({ rewardForm: defaultRewardForm(), isCreatingNewReward: false, selectedRewardId: null }),
}));
