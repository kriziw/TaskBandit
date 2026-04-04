import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsString } from "class-validator";

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
}
