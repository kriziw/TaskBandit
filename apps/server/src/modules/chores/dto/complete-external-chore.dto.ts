import { ApiProperty } from "@nestjs/swagger";
import { IsString, MaxLength } from "class-validator";
import { SubmitChoreDto } from "./submit-chore.dto";

export class CompleteExternalChoreDto extends SubmitChoreDto {
  @ApiProperty()
  @IsString()
  @MaxLength(120)
  externalCompleterName!: string;
}
