import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UpdateBetaSignupSettingsDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  defaultPackageCode!: string;
}
