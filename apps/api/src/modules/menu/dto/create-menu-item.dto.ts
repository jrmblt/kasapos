import { ModifierType } from "@repo/database";
import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";

export class ModifierOptionDto {
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsNumber()
  @Min(0)
  priceAdd!: number;
}

export class CreateModifierDto {
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsEnum(ModifierType)
  type!: ModifierType;

  @IsBoolean()
  @IsOptional()
  isRequired?: boolean;

  @IsInt()
  @Min(0)
  @IsOptional()
  minSelect?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  maxSelect?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ModifierOptionDto)
  options!: ModifierOptionDto[];

  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;
}

export class CreateMenuItemDto {
  @IsString()
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  nameEn?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  price!: number;

  @IsString()
  categoryId!: string;

  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  stockQty?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  stockAlert?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateModifierDto)
  modifiers?: CreateModifierDto[];
}
