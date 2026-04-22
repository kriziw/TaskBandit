import { ApiProperty } from "@nestjs/swagger";
import { IsISO8601, IsOptional, IsString, MaxLength } from "class-validator";

export class SnoozeDeferredChoreDto {
  @ApiProperty()
  @IsISO8601()
  notBeforeAt!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
