import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

export class CreateTenantUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MaxLength(100)
  name!: string;

  @IsString()
  @MinLength(4)
  @MaxLength(6)
  pinCode!: string;

  @IsString()
  roleId!: string;

  @IsString()
  @IsOptional()
  branchId?: string; // null = ทุกสาขา
}
