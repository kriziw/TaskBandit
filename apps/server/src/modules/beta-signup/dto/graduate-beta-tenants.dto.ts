import { IsArray, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class GraduateBetaTenantsDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  targetPackageCode!: string;

  /** If omitted all isBeta tenants are graduated. */
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  tenantIds?: string[];
}
