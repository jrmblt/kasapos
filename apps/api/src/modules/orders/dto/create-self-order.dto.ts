import { Type } from "class-transformer";
import {
  IsArray,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  ValidateNested,
} from "class-validator";

class SelfOrderItemDto {
  @IsString()
  menuItemId!: string;

  @IsInt()
  @IsPositive()
  qty!: number;

  @IsOptional()
  modifiers?: Record<string, string>;

  @IsOptional()
  @IsString()
  note?: string;
}

export class CreateSelfOrderDto {
  @IsString()
  branchId!: string;

  @IsOptional()
  @IsString()
  tableId?: string;

  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsOptional()
  @IsString()
  guestName?: string;

  @IsOptional()
  @IsString()
  memberAccountId?: string;

  @IsOptional()
  @IsString()
  checkoutMode?: "PAY_ONLINE" | "PAY_LATER" | "PAY_AT_COUNTER";

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SelfOrderItemDto)
  items!: SelfOrderItemDto[];
}
