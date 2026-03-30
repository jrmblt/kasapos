import { IsNumber, IsPositive, IsString } from "class-validator";

export class PayCashDto {
  @IsString()
  orderId!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  cashReceived!: number;

  @IsString()
  branchId!: string; // เพิ่ม — ใช้สร้าง queue ticket
}
