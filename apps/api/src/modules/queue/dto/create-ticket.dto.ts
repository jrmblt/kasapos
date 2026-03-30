import { IsString } from "class-validator";

export class CreateTicketDto {
  @IsString()
  orderId!: string;
}
