import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class ResetPinDto {
  @IsString()
  @MinLength(4)
  @MaxLength(6)
  newPin!: string;
}
