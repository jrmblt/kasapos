import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import * as crypto from "crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { RequestOtpDto } from "./dto/request-otp.dto";
import { VerifyOtpDto } from "./dto/verify-otp.dto";

const OTP_TTL_SECONDS = 5 * 60; // 5 นาที
const OTP_RATE_KEY = (phone: string, tenantId: string) =>
  `otp:rate:${tenantId}:${phone}`;
const MAX_OTP_ATTEMPTS = 5;
const SESSION_TTL = 30 * 24 * 60 * 60; // 30 วัน

@Injectable()
export class MemberAuthService {
  private readonly logger = new Logger(MemberAuthService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) { }

  // ── Request OTP ───────────────────────────────────────
  async requestOtp(dto: RequestOtpDto) {
    // Rate limit — max 3 ครั้งต่อ 10 นาที
    const rateKey = OTP_RATE_KEY(dto.phone, dto.tenantId);
    const count = await this.redis.get(rateKey);

    if (count && parseInt(count) >= 3) {
      throw new BadRequestException("ขอ OTP บ่อยเกินไป กรุณารอสักครู่");
    }

    // สร้าง OTP 6 หลัก
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // บันทึกลง DB (cleanup เก่าก่อน)
    await this.prisma.otpCode.deleteMany({
      where: {
        phone: dto.phone,
        tenantId: dto.tenantId,
        verified: false,
      },
    });

    await this.prisma.otpCode.create({
      data: {
        phone: dto.phone,
        tenantId: dto.tenantId,
        code,
        expiresAt: new Date(Date.now() + OTP_TTL_SECONDS * 1000),
        attempts: 0,
      },
    });

    // increment rate counter
    const pipeline = [
      ["incr", rateKey],
      ["expire", rateKey, "600"],
    ];
    await this.redis.set(rateKey, (parseInt(count ?? "0") + 1).toString(), 600);

    // ── ส่ง OTP ──────────────────────────────────────────
    if (process.env.USE_REAL_SMS === "true") {
      await this.sendSms(dto.phone, code);
    } else {
      // Dev mode — log แทนส่ง SMS
      this.logger.log(`[OTP DEV] ${dto.phone} → ${code}`);
    }

    return {
      message: "ส่ง OTP แล้ว",
      expiresIn: OTP_TTL_SECONDS,
      // dev mode เท่านั้น
      ...(process.env.USE_REAL_SMS !== "true" && { _devCode: code }),
    };
  }

  // ── Verify OTP + issue member session ─────────────────
  async verifyOtp(dto: VerifyOtpDto) {
    const otp = await this.prisma.otpCode.findFirst({
      where: {
        phone: dto.phone,
        tenantId: dto.tenantId,
        verified: false,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!otp) throw new UnauthorizedException("ไม่พบ OTP กรุณาขอใหม่");
    if (otp.expiresAt < new Date()) {
      throw new UnauthorizedException("OTP หมดอายุ กรุณาขอใหม่");
    }
    if (otp.attempts >= MAX_OTP_ATTEMPTS) {
      throw new UnauthorizedException("OTP ถูกใช้เกินจำนวนครั้ง กรุณาขอใหม่");
    }

    if (otp.code !== dto.code) {
      // increment attempts
      await this.prisma.otpCode.update({
        where: { id: otp.id },
        data: { attempts: { increment: 1 } },
      });
      const remaining = MAX_OTP_ATTEMPTS - (otp.attempts + 1);
      throw new UnauthorizedException(`OTP ไม่ถูกต้อง (เหลืออีก ${remaining} ครั้ง)`);
    }

    // mark verified
    await this.prisma.otpCode.update({
      where: { id: otp.id },
      data: { verified: true },
    });

    // upsert loyalty account (สมัครอัตโนมัติถ้ายังไม่มี)
    const lowestTier = await this.prisma.loyaltyTierConfig.findFirst({
      where: { tenantId: dto.tenantId },
      orderBy: { sortOrder: "asc" },
      select: { id: true },
    });

    const account = await this.prisma.loyaltyAccount.upsert({
      where: { tenantId_phone: { tenantId: dto.tenantId, phone: dto.phone } },
      create: {
        tenantId: dto.tenantId,
        phone: dto.phone,
        tierId: lowestTier?.id ?? null,
        points: 0,
        totalEarned: 0,
        visitCount: 0,
      },
      update: {},
      include: {
        tier: { select: { name: true, color: true, multiplier: true } },
      },
    });

    // สร้าง member session token
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + SESSION_TTL * 1000);

    await this.prisma.memberSession.create({
      data: { accountId: account.id, token, expiresAt },
    });

    return {
      token,
      expiresAt,
      isNewMember: account.visitCount === 0,
      account: {
        id: account.id,
        phone: account.phone,
        name: account.name,
        points: account.points,
        tier: account.tier,
        visitCount: account.visitCount,
      },
    };
  }

  // ── Validate session token (middleware ใช้) ────────────
  async validateSession(token: string) {
    const session = await this.prisma.memberSession.findUnique({
      where: { token },
      include: {
        account: {
          select: {
            id: true,
            tenantId: true,
            phone: true,
            name: true,
            points: true,
            tierId: true,
            tier: { select: { name: true, color: true } },
          },
        },
      },
    });

    if (!session) throw new UnauthorizedException("Session ไม่ถูกต้อง");
    if (session.expiresAt < new Date()) {
      await this.prisma.memberSession.delete({ where: { token } });
      throw new UnauthorizedException("Session หมดอายุ กรุณา login ใหม่");
    }

    return session.account;
  }

  // ── Logout ────────────────────────────────────────────
  async logout(token: string) {
    await this.prisma.memberSession.deleteMany({ where: { token } });
    return { success: true };
  }

  // ── Update profile ────────────────────────────────────
  async updateProfile(accountId: string, name: string) {
    return this.prisma.loyaltyAccount.update({
      where: { id: accountId },
      data: { name },
      select: { id: true, phone: true, name: true },
    });
  }

  // ── Private: SMS sender (swap ตอน production) ─────────
  private async sendSms(phone: string, code: string) {
    // TODO: swap provider ตาม env
    // Twilio: await twilioClient.messages.create(...)
    // AWS SNS: await sns.publish(...)
    this.logger.log(`[SMS] sending OTP to ${phone}`);
    throw new Error("SMS provider not configured");
  }
}
