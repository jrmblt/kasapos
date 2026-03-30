import { IsOptional, IsString } from "class-validator";

export class EarnPointsDto {
  @IsString()
  orderId!: string;

  @IsOptional()
  @IsString()
  phone?: string; // override ถ้า PromptPay ไม่มีเบอร์
}
