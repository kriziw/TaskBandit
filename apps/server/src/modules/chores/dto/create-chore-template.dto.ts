import { AssignmentStrategyType, Difficulty } from "@prisma/client";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested
} from "class-validator";

export class CreateChecklistItemDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @ApiProperty()
  @IsBoolean()
  required!: boolean;
}

export class CreateChoreTemplateDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(2000)
  description!: string;

  @ApiProperty({ enum: Difficulty, enumName: "Difficulty" })
  @Transform(({ value }) =>
    typeof value === "string" ? value.trim().toUpperCase() : value
  )
  @IsEnum(Difficulty)
  difficulty!: Difficulty;

  @ApiProperty({ enum: AssignmentStrategyType, enumName: "AssignmentStrategyType" })
  @Transform(({ value }) =>
    typeof value === "string"
      ? value.trim().toUpperCase().replace(/[\s-]+/g, "_")
      : value
  )
  @IsEnum(AssignmentStrategyType)
  assignmentStrategy!: AssignmentStrategyType;

  @ApiProperty()
  @IsBoolean()
  requirePhotoProof!: boolean;

  @ApiPropertyOptional({ type: [CreateChecklistItemDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(25)
  @ValidateNested({ each: true })
  @Type(() => CreateChecklistItemDto)
  checklist?: CreateChecklistItemDto[];
}
