import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";

export class CreateTenantDto {
  // ข้อมูลร้าน
  @IsString()
  @MaxLength(100)
  restaurantName!: string;

  @IsString()
  @MaxLength(50)
  @Matches(/^[a-z0-9-]+$/, { message: "slug ใช้ได้แค่ a-z, 0-9, -" })
  slug!: string;

  @IsEnum(["starter", "pro", "enterprise"])
  @IsOptional()
  plan?: string;

  // สาขาแรก
  @IsString()
  @MaxLength(100)
  branchName!: string;

  @IsString()
  @IsOptional()
  branchPhone?: string;

  @IsString()
  @IsOptional()
  branchAddress?: string;

  // Owner account
  @IsEmail()
  ownerEmail!: string;

  @IsString()
  @MaxLength(100)
  ownerName!: string;

  @IsString()
  @MinLength(4)
  @MaxLength(6)
  ownerPin!: string;
}
