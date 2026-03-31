import {
  Body,
  Controller,
  Delete,
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
import { CouponsService } from "./coupons.service";
import { ApplyCouponDto } from "./dto/apply-coupon.dto";
import { CreateCouponDto } from "./dto/create-coupon.dto";
import { ToggleCouponDto } from "./dto/toggle-coupon.dto";


@Controller("coupons")
export class CouponsController {
  constructor(private coupons: CouponsService) { }

  // ── Backoffice: CRUD ──────────────────────────────────

  @Get()
  @RequirePermissions(Permission.SETTINGS_READ)
  findAll(@CurrentUser() user: JwtPayload) {
    return this.coupons.findAll(user.tenantId);
  }

  @Post()
  @RequirePermissions(Permission.SETTINGS_WRITE)
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateCouponDto) {
    return this.coupons.create(user.tenantId, dto);
  }

  @Patch(":id/toggle")
  @RequirePermissions(Permission.SETTINGS_WRITE)
  toggle(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body() dto: ToggleCouponDto,
  ) {
    return this.coupons.toggle(user.tenantId, id, dto.isActive);
  }

  // ── POS / Self-order: validate ก่อน apply ─────────────
  // Public — self-order ใช้ได้ไม่ต้องมี staff token
  @Public()
  @Post("validate")
  @HttpCode(HttpStatus.OK)
  validate(@Body() body: ApplyCouponDto & { tenantId: string }) {
    return this.coupons.validate(
      body.tenantId,
      body.code,
      body.orderId,
      body.accountId ?? null,
    );
  }

  @Public()
  @Post("apply")
  @HttpCode(HttpStatus.OK)
  apply(@Body() body: ApplyCouponDto & { tenantId: string }) {
    return this.coupons.apply(body.tenantId, body);
  }

  @Public()
  @Delete(":orderId/:couponId")
  @HttpCode(HttpStatus.OK)
  remove(
    @Body("tenantId") tenantId: string,
    @Param("orderId") orderId: string,
    @Param("couponId") couponId: string,
  ) {
    return this.coupons.remove(tenantId, orderId, couponId);
  }
}
