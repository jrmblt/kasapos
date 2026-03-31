import { IsBoolean } from "class-validator";

export class ToggleCouponDto {
  @IsBoolean()
  isActive!: boolean;
}