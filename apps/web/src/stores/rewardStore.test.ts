import { beforeEach, describe, expect, it } from 'vitest';
import { useRewardStore } from './rewardStore';

beforeEach(() => {
  useRewardStore.setState({
    rewardsTab: 'shop',
    rewardsManagerTab: 'my_shop',
    selectedRewardId: null,
    isCreatingNewReward: false,
    rewardForm: {
      title: '',
      description: '',
      category: 'CUSTOM',
      eligibility: 'ALL',
      pointCost: 50,
      maxRedemptionsPerChild: '',
      cooldownDays: '',
      workflowType: 'STANDARD',
    },
    redeemDialogRewardId: null,
    rejectDialogRedemptionId: null,
    rejectDialogNote: '',
    showAllPointsLedger: false,
  });
});

describe('resetRewardForm', () => {
  it('clears form, creating flag, and selected id', () => {
    useRewardStore.setState({
      selectedRewardId: 'r1',
      isCreatingNewReward: true,
      rewardForm: {
        title: 'Test',
        description: '',
        category: 'CUSTOM',
        eligibility: 'ALL',
        pointCost: 10,
        maxRedemptionsPerChild: '',
        cooldownDays: '',
        workflowType: 'STANDARD',
      },
    });
    useRewardStore.getState().resetRewardForm();
    const { selectedRewardId, isCreatingNewReward, rewardForm } = useRewardStore.getState();
    expect(selectedRewardId).toBeNull();
    expect(isCreatingNewReward).toBe(false);
    expect(rewardForm.title).toBe('');
    expect(rewardForm.pointCost).toBe(50);
  });
});

describe('setRewardForm functional updater', () => {
  it('applies updater to the current form', () => {
    useRewardStore.getState().setRewardForm((prev) => ({ ...prev, title: 'Candy' }));
    expect(useRewardStore.getState().rewardForm.title).toBe('Candy');
  });
});

describe('setRejectDialogNote', () => {
  it('tracks rejection note', () => {
    useRewardStore.getState().setRejectDialogNote('Bad request');
    expect(useRewardStore.getState().rejectDialogNote).toBe('Bad request');
  });
});
