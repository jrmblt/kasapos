import { IsBoolean } from "class-validator";

export class ToggleQueueDto {
  @IsBoolean()
  enabled!: boolean;
}
