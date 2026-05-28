import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RedeemRewardDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
