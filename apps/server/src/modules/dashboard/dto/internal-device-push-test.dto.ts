import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsString, MaxLength } from "class-validator";

export class InternalDevicePushTestDto {
  @ApiProperty()
  @IsString()
  @MaxLength(200)
  userId!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(200)
  deviceId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(600)
  message?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(240)
  reason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  requestedBy?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  runWorkerOnce?: boolean;
}
