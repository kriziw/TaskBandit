import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsEnum, IsIn, IsOptional } from 'class-validator';

export enum HouseholdType {
  SOLO = 'solo',
  COUPLE = 'couple',
  FAMILY = 'family',
  FLATMATES = 'flatmates',
}

export enum HomeType {
  FLAT = 'flat',
  HOUSE = 'house',
  HOUSE_GARDEN = 'house_garden',
  HOUSE_GARDEN_LAWN = 'house_garden_lawn',
}

export enum GamificationStyle {
  TRACK_ONLY = 'track_only',
  LIGHT = 'light',
  FULL = 'full',
  DEFAULT = 'default',
}

const VALID_APPLIANCES = ['dishwasher', 'tumble_dryer', 'washing_machine', 'robot_vacuum'] as const;
const VALID_PETS = ['none', 'dog', 'cat', 'other'] as const;
const VALID_COOKING = ['one_person', 'take_turns', 'mostly_takeout', 'mixed'] as const;
const VALID_CHILD_AGES = ['under_5', '5_10', '11_15', '16_plus'] as const;

export class SubmitOnboardingDto {
  @ApiProperty({ enum: HouseholdType })
  @IsEnum(HouseholdType)
  householdType!: HouseholdType;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsIn(VALID_CHILD_AGES, { each: true })
  @ArrayMaxSize(4)
  childAges?: string[];

  @ApiProperty({ enum: HomeType })
  @IsEnum(HomeType)
  homeType!: HomeType;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsIn(VALID_APPLIANCES, { each: true })
  @ArrayMaxSize(4)
  appliances!: string[];

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsIn(VALID_PETS, { each: true })
  @ArrayMaxSize(4)
  pets!: string[];

  @ApiProperty()
  @IsIn(VALID_COOKING)
  cookingStyle!: string;

  @ApiProperty({ enum: GamificationStyle })
  @IsEnum(GamificationStyle)
  gamificationStyle!: GamificationStyle;
}
