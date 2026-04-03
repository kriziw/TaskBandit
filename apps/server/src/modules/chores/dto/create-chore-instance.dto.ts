import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsDate, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

export class CreateChoreInstanceDto {
  @ApiProperty()
  @IsUUID("4")
  templateId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID("4")
  assigneeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiProperty()
  @Type(() => Date)
  @IsDate()
  dueAt!: Date;
}
