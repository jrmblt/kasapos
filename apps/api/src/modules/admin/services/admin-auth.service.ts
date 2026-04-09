import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { AdminRole } from "@repo/database";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../../../prisma/prisma.service";
import { AdminLoginDto } from "../dto/admin-login.dto";

@Injectable()
export class AdminAuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) { }

  async login(dto: AdminLoginDto, ipAddress?: string) {
    const admin = await this.prisma.adminUser.findUnique({
      where: { email: dto.email },
    });

    if (!admin || !admin.isActive) {
      throw new UnauthorizedException("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
    }

    const valid = await bcrypt.compare(dto.password, admin.password);
    if (!valid) {
      // audit failed login
      await this.audit(
        admin.id,
        "LOGIN_FAILED",
        null,
        { email: dto.email },
        ipAddress,
      );
      throw new UnauthorizedException("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
    }

    // update lastLoginAt
    await this.prisma.adminUser.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    });

    await this.audit(admin.id, "LOGIN", null, {}, ipAddress);

    const token = this.jwt.sign(
      {
        sub: admin.id,
        email: admin.email,
        adminRole: admin.adminRole,
        type: "admin",
      },
      { expiresIn: "8h" },
    );

    return {
      accessToken: token,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        adminRole: admin.adminRole,
      },
    };
  }

  // สร้าง admin คนแรก (ใช้ครั้งแรกอย่างเดียว)
  async createFirstAdmin(email: string, password: string, name: string) {
    const exists = await this.prisma.adminUser.count();
    if (exists > 0) throw new ConflictException("Admin มีอยู่แล้ว");

    const hash = await bcrypt.hash(password, 12);
    return this.prisma.adminUser.create({
      data: { email, password: hash, name, adminRole: AdminRole.SUPER_ADMIN },
      select: { id: true, email: true, name: true, adminRole: true },
    });
  }

  // ── Impersonate tenant ──────────────────────────────────
  async impersonate(adminId: string, tenantId: string, ipAddress?: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, isActive: true },
    });
    if (!tenant) throw new UnauthorizedException("ไม่พบ tenant");

    await this.audit(
      adminId,
      "IMPERSONATE",
      tenantId,
      { tenantName: tenant.name },
      ipAddress,
    );

    // สร้าง token อายุสั้น 15 นาที — payload บอกว่า impersonate
    const token = this.jwt.sign(
      {
        sub: adminId,
        type: "admin",
        impersonating: tenantId,
        isImpersonating: true,
      },
      { expiresIn: "15m" },
    );

    // หา owner membership ของ tenant เพื่อแสดงข้อมูลใน impersonate session
    const ownerRole = await this.prisma.role.findFirst({
      where: { tenantId, baseRole: "OWNER" },
    });
    const ownerMembership = await this.prisma.tenantMembership.findFirst({
      where: { tenantId, roleId: ownerRole?.id },
      select: {
        id: true,
        tenantId: true,
        branchId: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return {
      impersonateToken: token,
      tenantId,
      tenantName: tenant.name,
      asUser: ownerMembership
        ? {
            id: ownerMembership.user.id,
            name: ownerMembership.user.name,
            email: ownerMembership.user.email,
            membershipId: ownerMembership.id,
            tenantId: ownerMembership.tenantId,
            branchId: ownerMembership.branchId,
          }
        : null,
      expiresIn: 900,
      warning: "This session lasts 15 minutes only",
    };
  }

  // ── Audit logger ────────────────────────────────────────
  async audit(
    adminId: string,
    action: string,
    tenantId: string | null,
    payload: object,
    ipAddress?: string,
  ) {
    return this.prisma.auditLog.create({
      data: { adminId, action, tenantId, payload, ipAddress },
    });
  }
}
