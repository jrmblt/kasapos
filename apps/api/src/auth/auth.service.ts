import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as crypto from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";

// TTL ตาม env หรือ fallback
const ACCESS_TTL = 15 * 60; // 15 นาที (วินาที)
const REFRESH_TTL = 8 * 60 * 60; // 8 ชั่วโมง (วินาที)

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private redis: RedisService,
  ) { }

  // ── Login ───────────────────────────────────────────────
  async login(email: string, pin: string) {
    console.log("email", email);
    console.log("pin", pin);
    const user = await this.prisma.user.findFirst({
      where: { email, isActive: true },
      select: {
        id: true,
        tenantId: true,
        branchId: true,
        role: true,
        name: true,
        pinCode: true,
        tokenVersion: true,
      },
    });

    console.log("user", user);

    if (!user || !user.pinCode || user.pinCode !== pin) {
      throw new UnauthorizedException("อีเมลหรือ PIN ไม่ถูกต้อง");
    }

    return this.issueTokenPair(user);
  }

  // ── Refresh ─────────────────────────────────────────────
  async refresh(userId: string, tokenId: string, tokenVersion: number) {
    // 1. ดึง hash จาก Redis
    const key = this.redis.refreshKey(userId, tokenId);
    const stored = await this.redis.get(key);

    if (!stored) {
      throw new UnauthorizedException("Session หมดอายุ กรุณา login ใหม่");
    }

    // 2. ลบ key เดิมทันที (rotation — ใช้ได้ครั้งเดียว)
    await this.redis.del(key);

    // 3. ตรวจ tokenVersion กับ DB
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        tenantId: true,
        branchId: true,
        role: true,
        name: true,
        isActive: true,
        tokenVersion: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException("บัญชีถูกระงับ");
    }

    if (user.tokenVersion !== tokenVersion) {
      // PIN ถูกเปลี่ยน หรือถูก kick → ยิง del ทุก session ทิ้งด้วย
      await this.redis.delPattern(`refresh:${userId}:*`);
      throw new ForbiddenException("Session ถูกยกเลิก กรุณา login ใหม่");
    }

    // 4. ออก token pair ใหม่
    return this.issueTokenPair(user);
  }

  // ── Logout ──────────────────────────────────────────────
  async logout(userId: string, tokenId: string) {
    await this.redis.del(this.redis.refreshKey(userId, tokenId));
  }

  // ── Logout all devices ──────────────────────────────────
  async logoutAll(userId: string) {
    await this.redis.delPattern(`refresh:${userId}:*`);
  }

  // ── Revoke user (kick พนักงาน / เปลี่ยน PIN) ────────────
  async revokeUser(userId: string) {
    await Promise.all([
      // increment tokenVersion → access token เดิมใช้ refresh ไม่ได้อีก
      this.prisma.user.update({
        where: { id: userId },
        data: { tokenVersion: { increment: 1 } },
      }),
      // ลบ refresh token ทุก device ทันที
      this.redis.delPattern(`refresh:${userId}:*`),
    ]);
  }

  // ── PIN verify สำหรับ sensitive actions (void, discount) ──
  async verifyPin(userId: string, pin: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { pinCode: true },
    });
    return user?.pinCode === pin;
  }

  // ── Private: สร้าง token pair ───────────────────────────
  private async issueTokenPair(user: {
    id: string;
    tenantId: string;
    branchId: string | null;
    role: string;
    name: string;
    tokenVersion: number;
  }) {
    const tokenId = crypto.randomUUID();

    const payload = {
      sub: user.id,
      tenantId: user.tenantId,
      branchId: user.branchId,
      role: user.role,
      name: user.name,
      version: user.tokenVersion,
      jti: tokenId,
    };

    const [accessToken, refreshToken] = await Promise.all([
      // access token — short lived
      this.jwt.signAsync(payload, { expiresIn: "15m" }),

      // refresh token — ใช้ sign ด้วย secret เดียวกัน แต่ TTL ยาวกว่า
      this.jwt.signAsync(
        { sub: user.id, jti: tokenId, version: user.tokenVersion },
        { expiresIn: "8h" },
      ),
    ]);

    // เก็บ hash ของ refresh token ใน Redis
    const hash = crypto.createHash("sha256").update(refreshToken).digest("hex");

    await this.redis.set(
      this.redis.refreshKey(user.id, tokenId),
      hash,
      REFRESH_TTL,
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        branchId: user.branchId,
      },
    };
  }
}
