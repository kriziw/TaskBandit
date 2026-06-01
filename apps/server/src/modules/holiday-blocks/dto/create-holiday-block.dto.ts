import { ApiProperty } from '@nestjs/swagger';
import { HolidayExistingMode } from '@prisma/client';
import { IsDateString, IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateHolidayBlockDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @ApiProperty({ description: 'ISO date string YYYY-MM-DD (household local date)' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ description: 'ISO date string YYYY-MM-DD (household local date, inclusive)' })
  @IsDateString()
  endDate!: string;

  @ApiProperty({ enum: HolidayExistingMode })
  @IsEnum(HolidayExistingMode)
  existingMode!: HolidayExistingMode;
}
