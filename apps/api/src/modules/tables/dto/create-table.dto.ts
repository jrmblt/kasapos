import { IsInt, IsOptional, IsString, MaxLength, Min } from "class-validator";

export class CreateTableDto {
  @IsString()
  @MaxLength(50)
  name!: string;

  @IsOptional()
  @IsString()
  zone?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;
}
