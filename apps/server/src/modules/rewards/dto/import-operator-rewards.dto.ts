import { RewardCategory } from '../../../generated/prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
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

export class OperatorRewardLocalizedTextDto {
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

export class OperatorRewardDto {
  /** Auto-generated key from the control plane Reward Studio, e.g. "rwd_a3f9c12e4b" */
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  @Matches(/^rwd_[a-z0-9]{10}$/, {
    message: 'key must match the operator reward pattern rwd_<10 lowercase hex chars>',
  })
  key!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(8)
  icon!: string;

  @ValidateNested()
  @Type(() => OperatorRewardLocalizedTextDto)
  title!: OperatorRewardLocalizedTextDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => OperatorRewardLocalizedTextDto)
  description?: OperatorRewardLocalizedTextDto;

  @IsEnum(RewardCategory)
  category!: RewardCategory;

  @IsInt()
  @Min(1)
  @Max(100000)
  pointCost!: number;

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
}

export class ImportOperatorRewardsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OperatorRewardDto)
  @ArrayMaxSize(50)
  rewards!: OperatorRewardDto[];
}
