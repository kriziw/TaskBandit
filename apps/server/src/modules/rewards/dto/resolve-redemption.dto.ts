import { IsBoolean, IsOptional, IsString, MaxLength } from "class-validator";

export class ResolveRedemptionDto {
  @IsBoolean()
  approved!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
