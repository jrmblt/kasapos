import { IsNumber, IsOptional, IsPositive, IsString } from "class-validator";

export class RefundDto {
  @IsString()
  paymentId!: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount?: number; // null = refund เต็ม

  @IsOptional()
  @IsString()
  reason?: string;
}
