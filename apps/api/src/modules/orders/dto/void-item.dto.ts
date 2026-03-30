import { IsString, Length, MinLength } from "class-validator";

export class VoidItemDto {
  @IsString()
  @MinLength(1)
  voidReason!: string;

  @IsString()
  @Length(4, 6)
  pin!: string; // Manager PIN ยืนยัน
}
