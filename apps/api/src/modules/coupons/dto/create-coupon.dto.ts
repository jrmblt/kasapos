import { CouponTargetType, CouponType } from "@repo/database";
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
} from "class-validator";

export class CreateCouponDto {
  @IsString()
  @MaxLength(50)
  code!: string;

  @IsString()
  @MaxLength(200)
  name!: string;

  @IsEnum(CouponType)
  type!: CouponType;

  @IsEnum(CouponTargetType)
  targetType!: CouponTargetType;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  value!: number; // 10 = 10% หรือ ฿10

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  minOrderAmt?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  maxDiscountAmt?: number; // cap สำหรับ PERCENT_DISCOUNT

  @IsOptional()
  @IsString()
  tierId?: string; // ถ้า targetType = MEMBER_TIER

  @IsOptional()
  @IsInt()
  @Min(1)
  usageLimit?: number; // null = ไม่จำกัด

  @IsOptional()
  @IsInt()
  @Min(1)
  usagePerMember?: number;

  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
