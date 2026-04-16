import { AssignmentStrategyType, RecurrenceEndMode, RecurrenceType } from "@prisma/client";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { Transform } from "class-transformer";
import { ArrayMaxSize, ArrayUnique, IsBoolean, IsDate, IsEnum, IsIn, IsOptional, IsString, IsUUID, MaxLength, Min, Max, IsInt, IsArray } from "class-validator";

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

  @ApiPropertyOptional({ enum: RecurrenceType, enumName: "RecurrenceType" })
  @Transform(({ value }) =>
    typeof value === "string"
      ? value.trim().toUpperCase().replace(/[\s-]+/g, "_")
      : value
  )
  @IsOptional()
  @IsEnum(RecurrenceType)
  recurrenceType?: RecurrenceType;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  recurrenceIntervalDays?: number;

  @ApiPropertyOptional({ enum: RecurrenceEndMode, enumName: "RecurrenceEndMode" })
  @Transform(({ value }) =>
    typeof value === "string"
      ? value.trim().toUpperCase().replace(/[\s-]+/g, "_")
      : value
  )
  @IsOptional()
  @IsEnum(RecurrenceEndMode)
  recurrenceEndMode?: RecurrenceEndMode;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  recurrenceOccurrences?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  recurrenceEndsAt?: Date;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(7)
  @ArrayUnique()
  @IsIn(["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"], {
    each: true
  })
  recurrenceWeekdays?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  suppressRecurrence?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  reassignAutomatically?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID("4")
  variantId?: string;

  @ApiProperty()
  @Type(() => Date)
  @IsDate()
  dueAt!: Date;
}
