import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from "class-validator";

export class RegisterNotificationDeviceDto {
  @ApiProperty()
  @IsString()
  @MaxLength(200)
  installationId!: string;

  @ApiPropertyOptional({
    enum: ["android", "web"]
  })
  @IsOptional()
  @IsIn(["android", "web"])
  platform?: "android" | "web";

  @ApiPropertyOptional({
    enum: ["generic", "fcm", "web_push"]
  })
  @IsOptional()
  @IsIn(["generic", "fcm", "web_push"])
  provider?: "generic" | "fcm" | "web_push";

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  pushToken?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  webPushP256dh?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  webPushAuth?: string;

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
