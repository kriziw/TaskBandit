import { Difficulty } from '../../../generated/prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class QuickLogChoreDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  instanceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  templateId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  createTemplateFromEntry?: boolean;

  @ApiPropertyOptional({ enum: Difficulty, enumName: 'Difficulty' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsOptional()
  @IsEnum(Difficulty)
  difficulty?: Difficulty;
}
