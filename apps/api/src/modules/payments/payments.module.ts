import { Module } from "@nestjs/common";
import { OrdersModule } from "../orders/orders.module";
import { QueueModule } from "../queue/queue.module";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";

@Module({
  imports: [OrdersModule, QueueModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
