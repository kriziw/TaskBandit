import { ApiProperty } from '@nestjs/swagger';
import { IsObject } from 'class-validator';

export class SaveOnboardingDraftDto {
  @ApiProperty({ description: 'Partial wizard answers to persist as a draft' })
  @IsObject()
  answers!: Record<string, unknown>;
}
