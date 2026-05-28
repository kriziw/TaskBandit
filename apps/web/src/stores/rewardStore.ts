import { create } from 'zustand';
import type { RewardCategory, RewardEligibility } from '../types/taskbandit';

export type RewardFormState = {
  title: string;
  description: string;
  category: RewardCategory;
  eligibility: RewardEligibility;
  pointCost: number;
  maxRedemptionsPerChild: string;
  cooldownDays: string;
};

const defaultRewardForm = (): RewardFormState => ({
  title: '',
  description: '',
  category: 'CUSTOM',
  eligibility: 'ALL',
  pointCost: 50,
  maxRedemptionsPerChild: '',
  cooldownDays: '',
});

interface RewardStore {
  rewardsTab: 'shop' | 'history';
  rewardsManagerTab: 'catalogue' | 'approvals' | 'my_shop';
  selectedRewardId: string | null;
  isCreatingNewReward: boolean;
  rewardForm: RewardFormState;
  redeemDialogRewardId: string | null;
  rejectDialogRedemptionId: string | null;
  rejectDialogNote: string;
  showAllPointsLedger: boolean;

  setRewardsTab: (v: 'shop' | 'history') => void;
  setRewardsManagerTab: (v: 'catalogue' | 'approvals' | 'my_shop') => void;
  setSelectedRewardId: (v: string | null) => void;
  setIsCreatingNewReward: (v: boolean) => void;
  setRewardForm: (v: RewardFormState | ((prev: RewardFormState) => RewardFormState)) => void;
  setRedeemDialogRewardId: (v: string | null) => void;
  setRejectDialogRedemptionId: (v: string | null) => void;
  setRejectDialogNote: (v: string) => void;
  setShowAllPointsLedger: (v: boolean) => void;

  resetRewardForm: () => void;
}

export const useRewardStore = create<RewardStore>((set) => ({
  rewardsTab: 'shop',
  rewardsManagerTab: 'my_shop',
  selectedRewardId: null,
  isCreatingNewReward: false,
  rewardForm: defaultRewardForm(),
  redeemDialogRewardId: null,
  rejectDialogRedemptionId: null,
  rejectDialogNote: '',
  showAllPointsLedger: false,

  setRewardsTab: (v) => set({ rewardsTab: v }),
  setRewardsManagerTab: (v) => set({ rewardsManagerTab: v }),
  setSelectedRewardId: (v) => set({ selectedRewardId: v }),
  setIsCreatingNewReward: (v) => set({ isCreatingNewReward: v }),
  setRewardForm: (v) => set((s) => ({ rewardForm: typeof v === 'function' ? v(s.rewardForm) : v })),
  setRedeemDialogRewardId: (v) => set({ redeemDialogRewardId: v }),
  setRejectDialogRedemptionId: (v) => set({ rejectDialogRedemptionId: v }),
  setRejectDialogNote: (v) => set({ rejectDialogNote: v }),
  setShowAllPointsLedger: (v) => set({ showAllPointsLedger: v }),

  resetRewardForm: () =>
    set({ rewardForm: defaultRewardForm(), isCreatingNewReward: false, selectedRewardId: null }),
}));
