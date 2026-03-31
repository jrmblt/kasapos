import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AuthModule } from "./auth/auth.module";
import { JwtAuthGuard } from "./auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "./auth/guards/permissions.guard";
import { RolesGuard } from "./auth/guards/roles.guard";
import { GatewayModule } from "./gateways/gateway.module";
import { LoyaltyModule } from "./modules/loyalty/loyalty.module";
import { MenuModule } from "./modules/menu/menu.module";
import { OrdersModule } from "./modules/orders/orders.module";
import { PaymentsModule } from "./modules/payments/payments.module";
import { QueueModule } from "./modules/queue/queue.module";
import { PrismaModule } from "./prisma/prisma.module";
import { RedisModule } from "./redis/redis.module";
import { CouponsModule } from './modules/coupons/coupons.module';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    AuthModule,
    MenuModule,
    OrdersModule,
    PaymentsModule,
    QueueModule,
    LoyaltyModule,
    GatewayModule,
    CouponsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule { }
