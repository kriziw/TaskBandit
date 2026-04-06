import { AssignmentStrategyType } from "@prisma/client";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { Transform } from "class-transformer";
import { IsBoolean, IsDate, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

export class CreateChoreInstanceDto {
  @ApiProperty()
  @IsUUID("4")
  templateId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID("4")
  assigneeId?: string;

  @ApiPropertyOptional({ enum: AssignmentStrategyType, enumName: "AssignmentStrategyType" })
  @Transform(({ value }) =>
    typeof value === "string"
      ? value.trim().toUpperCase().replace(/[\s-]+/g, "_")
      : value
  )
  @IsOptional()
  @IsEnum(AssignmentStrategyType)
  assignmentStrategy?: AssignmentStrategyType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  suppressRecurrence?: boolean;

  @ApiProperty()
  @Type(() => Date)
  @IsDate()
  dueAt!: Date;
}
