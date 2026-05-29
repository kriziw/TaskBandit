import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class ReviewBetaSignupDto {
  @IsIn(['approve', 'reject'])
  action!: 'approve' | 'reject';

  /** Override the default package code when approving. */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  packageCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  rejectionReason?: string;
}
