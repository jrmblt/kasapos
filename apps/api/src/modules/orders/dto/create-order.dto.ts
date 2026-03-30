import { OrderType } from "@repo/database";
import { Type } from "class-transformer";
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MinLength,
  ValidateNested,
} from "class-validator";

export class OrderItemDto {
  @IsString()
  menuItemId!: string;

  @IsInt()
  @IsPositive()
  qty!: number;

  @IsOptional()
  modifiers?: Record<string, string>; // { "ความเผ็ด": "เผ็ดน้อย" }

  @IsOptional()
  @IsString()
  note?: string;
}

export class CreateOrderDto {
  @IsString()
  branchId!: string;

  @IsOptional()
  @IsString()
  tableId?: string;

  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsEnum(OrderType)
  @IsOptional()
  type?: OrderType;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];

  @IsOptional()
  @IsString()
  note?: string;
}
