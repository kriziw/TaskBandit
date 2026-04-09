import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";

export class RespondChoreTakeoverDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(240)
  note?: string;
}
