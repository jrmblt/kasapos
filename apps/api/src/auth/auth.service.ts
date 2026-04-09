import {
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { BASE_ROLE_PERMISSIONS } from "@repo/database";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";
import { JwtPayload } from "./decorators/current-user.decorator";

const REFRESH_TTL = 8 * 60 * 60; // 8 ชั่วโมง (วินาที)

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private redis: RedisService,
  ) {}

  // ── Login ───────────────────────────────────────────────
  async login(email: string, pin: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        memberships: {
          where: { isActive: true },
          include: {
            tenant: { select: { id: true, name: true, slug: true } },
            branch: { select: { id: true, name: true } },
            role: { select: { permissions: true, baseRole: true } },
          },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException("ไม่พบบัญชีนี้");
    }

    if (user.memberships.length === 0) {
      throw new UnauthorizedException("ยังไม่ได้รับสิทธิ์เข้าร้านใด");
    }

    // 1 membership — login ตรง
    if (user.memberships.length === 1) {
      const membership = user.memberships[0]!;
      if (membership.pinCode !== pin) {
        throw new UnauthorizedException("PIN ไม่ถูกต้อง");
      }
      return this.issueTokens(user, membership);
    }

    // หลาย membership — match PIN ก่อน
    const matched = user.memberships.filter((m) => m.pinCode === pin);
    if (matched.length === 0) {
      throw new UnauthorizedException("PIN ไม่ถูกต้อง");
    }

    if (matched.length === 1) {
      return this.issueTokens(user, matched[0]!);
    }

    // PIN match หลาย tenant → ให้ client เลือก
    return {
      requireTenantSelect: true,
      userId: user.id,
      tenants: matched.map((m) => ({
        membershipId: m.id,
        tenantId: m.tenantId,
        tenantName: m.tenant.name,
        role: m.role?.baseRole,
        branchName: m.branch?.name ?? "ทุกสาขา",
        lastUsedAt: m.lastUsedAt,
      })),
    };
  }

  // ── Select tenant (multi-tenant login step 2) ───────────
  async selectTenant(userId: string, membershipId: string, pin: string) {
    const membership = await this.prisma.tenantMembership.findFirst({
      where: { id: membershipId, userId, isActive: true },
      include: {
        role: { select: { permissions: true, baseRole: true } },
      },
    });

    if (!membership) throw new UnauthorizedException("ไม่พบ membership");
    if (membership.pinCode !== pin)
      throw new UnauthorizedException("PIN ไม่ถูกต้อง");

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    return this.issueTokens(user, membership);
  }

  // ── Refresh ─────────────────────────────────────────────
  async refresh(membershipId: string, tokenVersion: number) {
    // ตรวจ tokenVersion จาก Redis (cache) หรือ DB
    const cachedVersion = await this.redis.get(`tv:${membershipId}`);
    const currentVersion = cachedVersion
      ? parseInt(cachedVersion)
      : await this.prisma.tenantMembership
          .findUnique({
            where: { id: membershipId },
            select: { tokenVersion: true, isActive: true },
          })
          .then((m) => {
            if (!m?.isActive) throw new UnauthorizedException("Membership ถูกระงับ");
            return m.tokenVersion;
          });

    if (tokenVersion !== currentVersion) {
      throw new UnauthorizedException("Session ถูกยกเลิก กรุณา login ใหม่");
    }

    const membership = await this.prisma.tenantMembership.findUniqueOrThrow({
      where: { id: membershipId },
      include: {
        user: {
          select: { id: true, name: true, email: true, isActive: true },
        },
        role: { select: { baseRole: true, permissions: true } },
      },
    });

    if (!membership.isActive || !membership.user.isActive) {
      throw new UnauthorizedException("บัญชีถูกระงับ");
    }

    return this.issueTokens(membership.user, membership);
  }

  // ── Logout (invalidate current device) ─────────────────
  async logout(membershipId: string) {
    await this.redis.del(`tv:${membershipId}`);
    return { success: true };
  }

  // ── Logout all (increment tokenVersion → revoke all tokens) ──
  async logoutAll(membershipId: string) {
    const updated = await this.prisma.tenantMembership.update({
      where: { id: membershipId },
      data: { tokenVersion: { increment: 1 } },
      select: { tokenVersion: true },
    });
    await this.redis.set(`tv:${membershipId}`, String(updated.tokenVersion), REFRESH_TTL);
    return { success: true };
  }

  // ── Revoke membership (kick / PIN change) ───────────────
  async revokeMembership(membershipId: string) {
    const updated = await this.prisma.tenantMembership.update({
      where: { id: membershipId },
      data: { tokenVersion: { increment: 1 } },
      select: { tokenVersion: true },
    });
    await this.redis.set(`tv:${membershipId}`, String(updated.tokenVersion), REFRESH_TTL);
  }

  // ── PIN verify สำหรับ sensitive actions (void, discount) ──
  async verifyPin(membershipId: string, pin: string): Promise<boolean> {
    const membership = await this.prisma.tenantMembership.findUnique({
      where: { id: membershipId },
      select: { pinCode: true },
    });
    return membership?.pinCode === pin;
  }

  // ── Private: build payload + sign token pair ────────────
  private async issueTokens(
    user: { id: string; name: string; email?: string | null; isActive?: boolean },
    membership: {
      id: string;
      tenantId: string;
      branchId: string | null;
      tokenVersion: number;
      role?: { baseRole: string; permissions: string[] } | null;
    },
  ) {
    await this.prisma.tenantMembership.update({
      where: { id: membership.id },
      data: { lastUsedAt: new Date() },
    });

    const baseRole = membership.role?.baseRole ?? "CASHIER";
    const permissions: string[] =
      membership.role?.permissions?.length
        ? membership.role.permissions
        : (BASE_ROLE_PERMISSIONS[baseRole] ?? []);

    const payload: JwtPayload = {
      sub: user.id,
      membershipId: membership.id,
      tenantId: membership.tenantId,
      branchId: membership.branchId ?? null,
      role: baseRole,
      name: user.name,
      tokenVersion: membership.tokenVersion,
      permissions,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, { expiresIn: "15m" }),
      this.jwt.signAsync(
        {
          sub: user.id,
          membershipId: membership.id,
          tokenVersion: membership.tokenVersion,
        },
        { expiresIn: "8h" },
      ),
    ]);

    // cache tokenVersion ใน Redis (TTL = refresh token lifetime)
    await this.redis.set(
      `tv:${membership.id}`,
      String(membership.tokenVersion),
      REFRESH_TTL,
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        tenantId: membership.tenantId,
        branchId: membership.branchId,
        role: baseRole,
        membershipId: membership.id,
      },
    };
  }
}
