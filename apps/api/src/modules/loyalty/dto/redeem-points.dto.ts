import { IsInt, IsPositive, IsString } from "class-validator";

export class RedeemPointsDto {
  @IsString()
  orderId!: string;

  @IsString()
  phone!: string;

  @IsInt()
  @IsPositive()
  points!: number; // จำนวนแต้มที่ต้องการใช้
}