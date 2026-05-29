import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UpdateTenantPackageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  packageCode!: string;
}
