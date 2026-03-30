import { IsInt, IsOptional, IsString, MaxLength, Min } from "class-validator";

export class CreateCategoryDto {
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  nameEn?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
