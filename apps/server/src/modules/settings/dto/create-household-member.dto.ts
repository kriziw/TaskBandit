import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsIn, IsString, MaxLength, MinLength } from "class-validator";

export class CreateHouseholdMemberDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  displayName!: string;

  @ApiProperty()
  @IsIn(["parent", "child"])
  role!: "parent" | "child";

  @ApiProperty()
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}
