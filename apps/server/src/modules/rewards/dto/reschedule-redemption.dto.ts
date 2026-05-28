import { IsDateString } from 'class-validator';

export class RescheduleRedemptionDto {
  /**
   * New target date for the booking (ISO date string, e.g. "2026-06-15").
   * If the redemption is PENDING the date is updated with no new approval needed.
   * If the redemption is APPROVED the existing approval is cancelled (points
   * refunded) and a new PENDING redemption is created for the new date.
   */
  @IsDateString()
  targetDate!: string;
}
