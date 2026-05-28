import { RewardCategory, RewardEligibility, RewardWorkflowType } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateRewardDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsEnum(RewardCategory)
  category?: RewardCategory;

  @IsOptional()
  @IsEnum(RewardEligibility)
  eligibility?: RewardEligibility;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  icon?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100000)
  pointCost?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(999)
  maxRedemptionsPerChild?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(365)
  cooldownDays?: number;

  @IsOptional()
  @IsEnum(RewardWorkflowType)
  workflowType?: RewardWorkflowType;
}
