import { AssignmentStrategyType, Difficulty, FollowUpDelayUnit, RecurrenceStartStrategy, RecurrenceType } from "@prisma/client";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayUnique,
  IsIn,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested
} from "class-validator";
import { supportedLanguages, SupportedLanguage } from "../../../common/i18n/supported-languages";

export class CreateChecklistItemDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @ApiProperty()
  @IsBoolean()
  required!: boolean;
}

export class CreateLocalizedTemplateTranslationDto {
  @ApiProperty({ enum: supportedLanguages })
  @IsString()
  @IsIn(supportedLanguages)
  locale!: SupportedLanguage;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  groupTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}

export class CreateLocalizedVariantLabelDto {
  @ApiProperty({ enum: supportedLanguages })
  @IsString()
  @IsIn(supportedLanguages)
  locale!: SupportedLanguage;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  label?: string;
}

export class CreateChoreTemplateVariantDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID("4")
  id?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  label!: string;

  @ApiPropertyOptional({ type: [CreateLocalizedVariantLabelDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => CreateLocalizedVariantLabelDto)
  translations?: CreateLocalizedVariantLabelDto[];
}

export class CreateChoreDependencyRuleDto {
  @ApiProperty()
  @IsUUID("4")
  templateId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  delayValue: number = 1;

  @ApiPropertyOptional({ enum: FollowUpDelayUnit, enumName: "FollowUpDelayUnit" })
  @Transform(({ value }) =>
    typeof value === "string" ? value.trim().toUpperCase() : value
  )
  @IsOptional()
  @IsEnum(FollowUpDelayUnit)
  delayUnit?: FollowUpDelayUnit;
}

export class CreateChoreTemplateDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  groupTitle!: string;

  @ApiPropertyOptional({ enum: supportedLanguages })
  @IsOptional()
  @IsString()
  @IsIn(supportedLanguages)
  defaultLocale?: SupportedLanguage;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(2000)
  description!: string;

  @ApiProperty({ enum: Difficulty, enumName: "Difficulty" })
  @Transform(({ value }) =>
    typeof value === "string" ? value.trim().toUpperCase() : value
  )
  @IsEnum(Difficulty)
  difficulty!: Difficulty;

  @ApiProperty({ enum: AssignmentStrategyType, enumName: "AssignmentStrategyType" })
  @Transform(({ value }) =>
    typeof value === "string"
      ? value.trim().toUpperCase().replace(/[\s-]+/g, "_")
      : value
  )
  @IsEnum(AssignmentStrategyType)
  assignmentStrategy!: AssignmentStrategyType;

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

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(7)
  @ArrayUnique()
  @IsIn(["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"], {
    each: true
  })
  recurrenceWeekdays?: string[];

  @ApiProperty()
  @IsBoolean()
  requirePhotoProof!: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  stickyFollowUpAssignee?: boolean;

  @ApiPropertyOptional({ type: [CreateChecklistItemDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(25)
  @ValidateNested({ each: true })
  @Type(() => CreateChecklistItemDto)
  checklist?: CreateChecklistItemDto[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ArrayUnique()
  @IsUUID("4", { each: true })
  dependencyTemplateIds?: string[];

  @ApiPropertyOptional({ type: [CreateChoreDependencyRuleDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => CreateChoreDependencyRuleDto)
  dependencyRules?: CreateChoreDependencyRuleDto[];

  @ApiPropertyOptional({ enum: RecurrenceStartStrategy, enumName: "RecurrenceStartStrategy" })
  @Transform(({ value }) =>
    typeof value === "string" ? value.trim().toUpperCase().replace(/[\s-]+/g, "_") : value
  )
  @IsOptional()
  @IsEnum(RecurrenceStartStrategy)
  recurrenceStartStrategy?: RecurrenceStartStrategy;

  @ApiPropertyOptional({ type: [CreateChoreTemplateVariantDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => CreateChoreTemplateVariantDto)
  variants?: CreateChoreTemplateVariantDto[];

  @ApiPropertyOptional({ type: [CreateLocalizedTemplateTranslationDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => CreateLocalizedTemplateTranslationDto)
  translations?: CreateLocalizedTemplateTranslationDto[];
}
