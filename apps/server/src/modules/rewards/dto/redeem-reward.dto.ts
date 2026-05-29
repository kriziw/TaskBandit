import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class RedeemRewardDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  /**
   * Target date for DAILY_EXCLUSIVE rewards (ISO date string, e.g. "2026-06-08").
   * Required when the reward has workflowType === DAILY_EXCLUSIVE.
   * Ignored for STANDARD rewards.
   */
  @IsOptional()
  @IsDateString()
  targetDate?: string;
}
