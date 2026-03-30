import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import { Permission } from "@repo/database";
import {
  CurrentUser,
  type JwtPayload,
} from "../../auth/decorators/current-user.decorator";
import { RequirePermissions } from "../../auth/decorators/permissions.decorator";
import { Public } from "../../auth/decorators/public.decorator";
import { CreateOrderDto } from "./dto/create-order.dto";
import { UpdateOrderItemStatusDto } from "./dto/update-order-item-status.dto";
import { VoidItemDto } from "./dto/void-item.dto";
import { OrdersService } from "./orders.service";

@Controller("orders")
export class OrdersController {
  constructor(private orders: OrdersService) { }

  @Post()
  @RequirePermissions(Permission.ORDER_CREATE)
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateOrderDto) {
    return this.orders.create(user.sub, user.tenantId, dto);
  }

  @Get("kds/:branchId")
  @RequirePermissions(Permission.ORDER_VIEW)
  getKdsFeed(@Param("branchId") branchId: string) {
    return this.orders.getKdsFeed(branchId);
  }

  @Get(":id")
  @RequirePermissions(Permission.ORDER_VIEW)
  findOne(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.orders.findOne(user.tenantId, id);
  }

  @Patch(":orderId/items/:itemId/status")
  @RequirePermissions(Permission.ORDER_VIEW)
  updateItemStatus(
    @Param("orderId") orderId: string,
    @Param("itemId") itemId: string,
    @Body() dto: UpdateOrderItemStatusDto,
  ) {
    return this.orders.updateItemStatus(orderId, itemId, dto.status);
  }

  @Patch(":orderId/items/:itemId/void")
  @RequirePermissions(Permission.ORDER_VOID)
  @HttpCode(HttpStatus.OK)
  voidItem(
    @CurrentUser() user: JwtPayload,
    @Param("orderId") orderId: string,
    @Param("itemId") itemId: string,
    @Body() dto: VoidItemDto,
  ) {
    return this.orders.voidItem(user.sub, user.tenantId, orderId, itemId, dto);
  }

  @Patch(":id/complete")
  @RequirePermissions(Permission.PAYMENT_PROCESS)
  complete(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.orders.complete(id, user.tenantId);
  }

  // public — ลูกค้าสแกน QR ท้ายใบเสร็จ ไม่ต้อง login
  @Public()
  @Get("receipt/:token")
  findByReceiptToken(@Param("token") token: string) {
    return this.orders.findByReceiptToken(token);
  }
}
