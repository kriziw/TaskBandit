import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from "class-validator";

export class BootstrapHouseholdDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  householdName!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  ownerDisplayName!: string;

  @ApiProperty()
  @IsEmail()
  ownerEmail!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  ownerPassword!: string;

  @ApiProperty()
  @IsBoolean()
  selfSignupEnabled!: boolean;
}
