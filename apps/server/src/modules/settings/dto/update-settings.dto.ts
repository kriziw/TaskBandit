import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class UpdateSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  selfSignupEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  onboardingCompleted?: boolean;

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  localAuthEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  oidcEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  oidcAuthority?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  oidcClientId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  oidcClientSecret?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  oidcScope?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  smtpEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  smtpHost?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  smtpPort?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  smtpSecure?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  smtpUsername?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  smtpPassword?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  smtpFromEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  smtpFromName?: string;
}
