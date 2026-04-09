import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

export class RequestChoreTakeoverDto {
  @ApiProperty()
  @IsUUID("4")
  requestedUserId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(240)
  note?: string;
}
