import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AdminRole, BASE_ROLE_PERMISSIONS, UserRole } from "@repo/database";
// import * as bcrypt from "bcryptjs";
// import * as crypto from "crypto";
// import { BASE_ROLE_PERMISSIONS } from "../../../permissions";
import { PrismaService } from "../../../prisma/prisma.service";
import { CreateTenantDto } from "../dto/create-tenant.dto";
import { CreateTenantUserDto } from "../dto/create-tenant-user.dto";
import { UpdateTenantDto } from "../dto/update-tenant.dto";
import { AdminAuthService } from "./admin-auth.service";

@Injectable()
export class AdminTenantsService {
  constructor(
    private prisma: PrismaService,
    private adminAuth: AdminAuthService,
  ) { }

  // ── List tenants ──────────────────────────────────────
  async list(page = 1, search = "") {
    const take = 20;
    const skip = (page - 1) * take;
    const where = search
      ? {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { slug: { contains: search, mode: "insensitive" as const } },
        ],
      }
      : {};

    const [tenants, total] = await Promise.all([
      this.prisma.tenant.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: { branches: true, users: true },
          },
        },
      }),
      this.prisma.tenant.count({ where }),
    ]);

    return { tenants, total, page, pages: Math.ceil(total / take) };
  }

  // ── Get tenant detail ─────────────────────────────────
  async getOne(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        branches: true,
        users: {
          include: { role: { select: { name: true } } },
          orderBy: { createdAt: "asc" },
        },
        loyaltyTierConfigs: { orderBy: { sortOrder: "asc" } },
        _count: { select: { branches: true, users: true } },
      },
    });
    if (!tenant) throw new NotFoundException("ไม่พบ tenant");
    return tenant;
  }

  // ── Create tenant (full setup in 1 transaction) ───────
  async create(dto: CreateTenantDto, adminId: string) {
    const existing = await this.prisma.tenant.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) throw new ConflictException(`slug "${dto.slug}" มีอยู่แล้ว`);

    return this.prisma.$transaction(async (tx) => {
      // 1. Tenant
      const tenant = await tx.tenant.create({
        data: {
          name: dto.restaurantName,
          slug: dto.slug,
          plan: dto.plan ?? "starter",
          settings: {
            loyalty: {
              enabled: false,
              earnRate: 1,
              earnPer: 100,
              redeemRate: 1,
              minRedeemPoints: 50,
              pointExpireMonths: null,
            },
            coupon: {
              enabled: false,
              maxPerOrder: 1,
              stackWithPoints: false,
              stackBetweenCoupons: false,
            },
          },
        },
      });

      // 2. Branch แรก
      const branch = await tx.branch.create({
        data: {
          tenantId: tenant.id,
          name: dto.branchName,
          phone: dto.branchPhone,
          address: dto.branchAddress,
          selfOrderEnabled: false,
          queueEnabled: false,
          loyaltyEnabled: false,
        },
      });

      // 3. System roles
      const roleMap: Record<string, string> = {};
      for (const baseRole of [
        "OWNER",
        "MANAGER",
        "CASHIER",
        "KITCHEN",
      ] as UserRole[]) {
        const role = await tx.role.create({
          data: {
            tenantId: tenant.id,
            name: baseRole,
            baseRole,
            permissions: BASE_ROLE_PERMISSIONS[baseRole] ?? [],
            isSystem: true,
          },
        });
        roleMap[baseRole] = role.id;
      }

      // 4. Default loyalty tiers
      await tx.loyaltyTierConfig.createMany({
        data: [
          {
            tenantId: tenant.id,
            name: "Bronze",
            minPoints: 0,
            multiplier: 1.0,
            color: "#CD7F32",
            sortOrder: 1,
          },
          {
            tenantId: tenant.id,
            name: "Silver",
            minPoints: 500,
            multiplier: 1.5,
            color: "#C0C0C0",
            sortOrder: 2,
          },
          {
            tenantId: tenant.id,
            name: "Gold",
            minPoints: 2000,
            multiplier: 2.0,
            color: "#FFD700",
            sortOrder: 3,
          },
          {
            tenantId: tenant.id,
            name: "Platinum",
            minPoints: 8000,
            multiplier: 3.0,
            color: "#E5E4E2",
            sortOrder: 4,
          },
        ],
      });

      // 5. Owner user
      const owner = await tx.user.create({
        data: {
          tenantId: tenant.id,
          branchId: branch.id,
          name: dto.ownerName,
          email: dto.ownerEmail,
          pinCode: dto.ownerPin,
          roleId: roleMap["OWNER"],
          isActive: true,
        },
      });

      // 6. Audit
      await this.adminAuth.audit(adminId, "CREATE_TENANT", tenant.id, {
        restaurantName: dto.restaurantName,
        slug: dto.slug,
        plan: dto.plan ?? "starter",
        ownerEmail: dto.ownerEmail,
      });

      return { tenant, branch, owner: { ...owner, pinCode: undefined } };
    });
  }

  // ── Update tenant ─────────────────────────────────────
  async update(tenantId: string, dto: UpdateTenantDto, adminId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) throw new NotFoundException("ไม่พบ tenant");

    const updated = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        plan: dto.plan,
        isActive: dto.isActive,
        trialEndsAt: dto.trialEndsAt ? new Date(dto.trialEndsAt) : undefined,
        suspendedAt:
          dto.isActive === false
            ? new Date()
            : dto.isActive === true
              ? null
              : undefined,
        suspendReason: dto.isActive === false ? dto.suspendReason : null,
      },
    });

    await this.adminAuth.audit(adminId, "UPDATE_TENANT", tenantId, dto);
    return updated;
  }

  // ── Create user for tenant ─────────────────────────────
  async createUser(
    tenantId: string,
    dto: CreateTenantUserDto,
    adminId: string,
  ) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) throw new NotFoundException("ไม่พบ tenant");

    const existing = await this.prisma.user.findUnique({
      where: { tenantId_email: { tenantId, email: dto.email } },
    });
    if (existing) throw new ConflictException("อีเมลนี้มีอยู่แล้วใน tenant นี้");

    const user = await this.prisma.user.create({
      data: {
        tenantId: tenant.id,
        branchId: dto.branchId ?? null,
        email: dto.email,
        name: dto.name,
        pinCode: dto.pinCode,
        roleId: dto.roleId,
        isActive: true,
      },
      include: {
        role: { select: { name: true } },
        branch: { select: { name: true } },
      },
    });

    await this.adminAuth.audit(adminId, "CREATE_TENANT_USER", tenantId, {
      email: dto.email,
      roleId: dto.roleId,
    });

    return { ...user, pinCode: undefined }; // ไม่ return PIN
  }

  // ── Reset user PIN ────────────────────────────────────
  async resetUserPin(
    tenantId: string,
    userId: string,
    newPin: string,
    adminId: string,
  ) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
    });
    if (!user) throw new NotFoundException("ไม่พบ user");

    await this.prisma.user.update({
      where: { id: userId },
      data: { pinCode: newPin, tokenVersion: { increment: 1 } },
    });

    await this.adminAuth.audit(adminId, "RESET_USER_PIN", tenantId, { userId });
    return { success: true };
  }

  // ── Platform stats ────────────────────────────────────
  async getStats() {
    const [
      totalTenants,
      activeTenants,
      totalUsers,
      totalBranches,
      ordersToday,
      recentTenants,
    ] = await Promise.all([
      this.prisma.tenant.count(),
      this.prisma.tenant.count({ where: { isActive: true } }),
      this.prisma.user.count(),
      this.prisma.branch.count(),
      this.prisma.order.count({
        where: {
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
      this.prisma.tenant.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, name: true, plan: true, createdAt: true },
      }),
    ]);

    return {
      totalTenants,
      activeTenants,
      totalUsers,
      totalBranches,
      ordersToday,
      recentTenants,
    };
  }

  // ── Audit logs ────────────────────────────────────────
  async getAuditLogs(tenantId?: string, page = 1) {
    const take = 50;
    const skip = (page - 1) * take;
    const where = tenantId ? { tenantId } : {};

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          admin: { select: { name: true, email: true } },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { logs, total, page, pages: Math.ceil(total / take) };
  }
}
