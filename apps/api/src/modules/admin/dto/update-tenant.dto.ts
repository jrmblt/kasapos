import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
} from "class-validator";

export class UpdateTenantDto {
  @IsOptional()
  @IsEnum(["starter", "pro", "enterprise"])
  plan?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsDateString()
  trialEndsAt?: string;

  @IsOptional()
  @IsString()
  suspendReason?: string;
}
