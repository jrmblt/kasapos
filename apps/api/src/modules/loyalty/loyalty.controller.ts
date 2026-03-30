import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { Permission } from "@repo/database";
import {
  CurrentUser,
  type JwtPayload,
} from "../../auth/decorators/current-user.decorator";
import { RequirePermissions } from "../../auth/decorators/permissions.decorator";
import { Public } from "../../auth/decorators/public.decorator";
import { EarnPointsDto } from "./dto/earn-points.dto";
import { RedeemPointsDto } from "./dto/redeem-points.dto";
import { LoyaltyService } from "./loyalty.service";

@Controller("loyalty")
export class LoyaltyController {
  constructor(private loyalty: LoyaltyService) { }

  // ── Tiers ─────────────────────────────────────────────
  @Get("tiers")
  @RequirePermissions(Permission.SETTINGS_READ)
  getTiers(@CurrentUser() user: JwtPayload) {
    return this.loyalty.getTiers(user.tenantId);
  }

  // ── Account by phone ──────────────────────────────────
  @Get("account/:phone")
  @RequirePermissions(Permission.STAFF_VIEW)
  getAccount(@CurrentUser() user: JwtPayload, @Param("phone") phone: string) {
    return this.loyalty.getAccount(user.tenantId, phone);
  }

  // ── Public: ดูแต้มผ่าน receipt QR ────────────────────
  @Public()
  @Get("by-order/:orderId")
  getByOrder(@Param("orderId") orderId: string) {
    return this.loyalty.getAccountByOrder(orderId);
  }

  // ── Earn ─────────────────────────────────────────────
  @Post("earn")
  @RequirePermissions(Permission.PAYMENT_PROCESS)
  earn(@CurrentUser() user: JwtPayload, @Body() dto: EarnPointsDto) {
    return this.loyalty.earn(user.tenantId, dto);
  }

  // ── Redeem ────────────────────────────────────────────
  @Post("redeem")
  @RequirePermissions(Permission.PAYMENT_PROCESS)
  redeem(@CurrentUser() user: JwtPayload, @Body() dto: RedeemPointsDto) {
    return this.loyalty.redeem(user.tenantId, dto);
  }
}
