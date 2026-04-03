import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional } from "class-validator";

export class UpdateSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  selfSignupEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  membersCanSeeFullHouseholdChoreDetails?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enablePushNotifications?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enableOverduePenalties?: boolean;
}

