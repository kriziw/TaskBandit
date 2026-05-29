import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class SubmitBetaSignupDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  displayName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  phone!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  householdName!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  householdSizeEstimate?: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  billingAddressLine1!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  billingCity!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  billingPostalCode!: string;

  /** ISO 3166-1 alpha-2 country code, e.g. "GB" */
  @IsString()
  @IsNotEmpty()
  @MaxLength(2)
  billingCountry!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;
}
