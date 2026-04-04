import { IsBoolean, IsOptional } from "class-validator";

export class UpdateNotificationPreferencesDto {
  @IsOptional()
  @IsBoolean()
  receiveAssignments?: boolean;

  @IsOptional()
  @IsBoolean()
  receiveReviewUpdates?: boolean;

  @IsOptional()
  @IsBoolean()
  receiveDueSoonReminders?: boolean;

  @IsOptional()
  @IsBoolean()
  receiveOverdueAlerts?: boolean;

  @IsOptional()
  @IsBoolean()
  receiveDailySummary?: boolean;
}
