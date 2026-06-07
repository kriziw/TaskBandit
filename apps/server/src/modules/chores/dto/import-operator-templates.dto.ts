import {
  AssignmentStrategyType,
  Difficulty,
  FollowUpDelayUnit,
  RecurrenceStartStrategy,
  RecurrenceType,
} from '../../../generated/prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class OperatorLocalizedTextDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  en!: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  de?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  hu?: string;
}

export class OperatorChecklistItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @IsBoolean()
  required!: boolean;
}

export class OperatorVariantDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  label!: string;
}

export class OperatorFollowUpDto {
  @IsString()
  @IsNotEmpty()
  key!: string;

  @IsInt()
  @Min(1)
  @Max(8760)
  delayValue!: number;

  @IsEnum(FollowUpDelayUnit)
  delayUnit!: FollowUpDelayUnit;
}

export class OperatorTemplateDto {
  /** Auto-generated key from the control plane, e.g. "op_a3f9c12e4b" */
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  @Matches(/^op_[a-z0-9]{10}$/, {
    message: 'key must match the operator template pattern op_<10 hex chars>',
  })
  key!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(8)
  icon!: string;

  @ValidateNested()
  @Type(() => OperatorLocalizedTextDto)
  groupTitle!: OperatorLocalizedTextDto;

  @ValidateNested()
  @Type(() => OperatorLocalizedTextDto)
  title!: OperatorLocalizedTextDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => OperatorLocalizedTextDto)
  description?: OperatorLocalizedTextDto;

  @IsEnum(Difficulty)
  difficulty!: Difficulty;

  @IsEnum(AssignmentStrategyType)
  assignmentStrategy!: AssignmentStrategyType;

  @IsEnum(RecurrenceType)
  recurrenceType!: RecurrenceType;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  recurrenceIntervalDays?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(7)
  recurrenceWeekdays?: string[];

  @IsEnum(RecurrenceStartStrategy)
  recurrenceStartStrategy!: RecurrenceStartStrategy;

  @IsOptional()
  @IsBoolean()
  requirePhotoProof?: boolean;

  @IsOptional()
  @IsBoolean()
  stickyFollowUpAssignee?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OperatorChecklistItemDto)
  @ArrayMaxSize(20)
  checklist?: OperatorChecklistItemDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OperatorVariantDto)
  @ArrayMaxSize(20)
  variants?: OperatorVariantDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OperatorFollowUpDto)
  @ArrayMaxSize(5)
  followUps?: OperatorFollowUpDto[];
}

export class ImportOperatorTemplatesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OperatorTemplateDto)
  @ArrayMaxSize(50)
  templates!: OperatorTemplateDto[];

  /**
   * When true, the import overwrites templates that the household has
   * previously customised, and resets their userCustomized flag to false.
   * Use this for critical operator updates that must be applied universally.
   */
  @IsOptional()
  @IsBoolean()
  overrideCustomized?: boolean;
}
