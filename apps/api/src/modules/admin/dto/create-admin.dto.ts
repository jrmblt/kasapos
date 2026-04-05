import { IsOptional, IsString, MinLength } from "class-validator";

export class CreateFirstAdminDto {
  @IsString()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  secret?: string;
}
