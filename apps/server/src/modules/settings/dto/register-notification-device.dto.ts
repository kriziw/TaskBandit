import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from "class-validator";

export class RegisterNotificationDeviceDto {
  @ApiProperty()
  @IsString()
  @MaxLength(200)
  installationId!: string;

  @ApiPropertyOptional({
    enum: ["android"]
  })
  @IsOptional()
  @IsIn(["android"])
  platform?: "android";

  @ApiPropertyOptional({
    enum: ["generic", "fcm"]
  })
  @IsOptional()
  @IsIn(["generic", "fcm"])
  provider?: "generic" | "fcm";

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  pushToken?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  deviceName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  appVersion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  locale?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  notificationsEnabled?: boolean;
}
