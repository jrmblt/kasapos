import { IsNumber, IsPositive, IsString } from "class-validator";

export class OpenShiftDto {
  @IsString()
  branchId!: string;

  @IsNumber()
  @IsPositive()
  openCash!: number;
}

export class CloseShiftDto {
  @IsNumber()
  @IsPositive()
  closeCash!: number;
}
