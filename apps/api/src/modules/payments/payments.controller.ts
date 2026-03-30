import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  RawBody,
} from "@nestjs/common";
import { Permission } from "@repo/database";
import * as crypto from "crypto";
import {
  CurrentUser,
  JwtPayload,
} from "../../auth/decorators/current-user.decorator";
import { RequirePermissions } from "../../auth/decorators/permissions.decorator";
import { Public } from "../../auth/decorators/public.decorator";
import { PayCashDto } from "./dto/pay-cash.dto";
import { PayPromptPayDto } from "./dto/pay-promptpay.dto";
import { RefundDto } from "./dto/refund.dto";
import { PaymentsService } from "./payments.service";

@Controller("payments")
export class PaymentsController {
  constructor(private payments: PaymentsService) { }

  // ── PromptPay QR ─────────────────────────────────────
  @Post("promptpay")
  @RequirePermissions(Permission.PAYMENT_PROCESS)
  createPromptPay(@Body() dto: PayPromptPayDto) {
    return this.payments.createPromptPay(dto);
  }

  // ── Mock confirm (dev only) ───────────────────────────
  @Post("mock-confirm/:paymentId")
  @RequirePermissions(Permission.PAYMENT_PROCESS)
  mockConfirm(@Param("paymentId") paymentId: string) {
    return this.payments.mockConfirmPromptPay(paymentId);
  }

  // ── Cash ─────────────────────────────────────────────
  @Post("cash")
  @RequirePermissions(Permission.PAYMENT_PROCESS)
  payCash(@Body() dto: PayCashDto) {
    return this.payments.payCash(dto);
  }

  // ── Refund ───────────────────────────────────────────
  @Post("refund")
  @RequirePermissions(Permission.PAYMENT_REFUND)
  refund(@Body() dto: RefundDto) {
    return this.payments.refund(dto);
  }

  // ── Payment Status ────────────────────────────────────
  @Get(":id/status")
  @RequirePermissions(Permission.PAYMENT_PROCESS)
  getStatus(@Param("id") id: string) {
    return this.payments.getStatus(id);
  }

  // ── Omise Webhook ─────────────────────────────────────
  // Public — Omise เรียกตรงไม่มี token
  @Public()
  @Post("webhook/omise")
  @HttpCode(HttpStatus.OK)
  async omiseWebhook(
    @RawBody() rawBody: Buffer,
    @Headers("x-omise-webhook-signature") signature: string,
  ) {
    // ── verify signature ──────────────────────────────
    const secret = process.env.OMISE_WEBHOOK_SECRET;
    if (secret) {
      const expected = crypto
        .createHmac("sha256", secret)
        .update(rawBody)
        .digest("hex");

      const valid = crypto.timingSafeEqual(
        Buffer.from(expected, "hex"),
        Buffer.from(signature ?? "", "hex"),
      );
      if (!valid) throw new BadRequestException("Invalid webhook signature");
    }

    const event = JSON.parse(rawBody.toString());

    // ── route ตาม event key ────────────────────────────
    if (event.key === "charge.complete") {
      await this.payments.handleChargeComplete(event.data);
    }
    // เพิ่ม event อื่นๆ ได้ตรงนี้:
    // if (event.key === 'refund.create') { ... }

    return { received: true };
  }
}
