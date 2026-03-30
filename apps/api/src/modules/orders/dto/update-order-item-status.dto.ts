import { OrderItemStatus } from "@repo/database";
import { IsEnum } from "class-validator";

export class UpdateOrderItemStatusDto {
  @IsEnum(OrderItemStatus)
  status!: OrderItemStatus;
}
