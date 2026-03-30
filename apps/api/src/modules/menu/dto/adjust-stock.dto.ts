import { IsInt, IsOptional, IsString } from "class-validator";

export class AdjustStockDto {
  @IsInt()
  delta!: number; // บวก = เพิ่ม, ลบ = ลด

  @IsOptional()
  @IsString()
  note?: string;
}
