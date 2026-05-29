-- Add target date to reward redemptions for forward-dated DAILY_EXCLUSIVE claims
ALTER TABLE "RewardRedemption" ADD COLUMN "targetDate" DATE;

-- Add day-of booking reminder notification type
ALTER TYPE "NotificationType" ADD VALUE 'REWARD_BOOKING_REMINDER';
