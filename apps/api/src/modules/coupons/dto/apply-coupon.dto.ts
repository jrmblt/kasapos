import { IsOptional, IsString } from "class-validator";

export class ApplyCouponDto {
  @IsString()
  code!: string;

  @IsString()
  orderId!: string;

  @IsOptional()
  @IsString()
  accountId?: string; // null = guest
}
