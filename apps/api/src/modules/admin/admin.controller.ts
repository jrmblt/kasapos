import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AdminRole } from "@repo/database";
import type { Request } from "express";
import { AdminUser } from "./decorators/admin-user.decorator";
import { RequireAdminRole } from "./decorators/require-admin-role.decorator";
import { AdminLoginDto } from "./dto/admin-login.dto";
import { CreateFirstAdminDto } from "./dto/create-admin.dto";
import { CreateTenantDto } from "./dto/create-tenant.dto";
import { CreateTenantUserDto } from "./dto/create-tenant-user.dto";
import { ResetPinDto } from "./dto/reset-pin.dto";
import { UpdateTenantDto } from "./dto/update-tenant.dto";
import { AdminJwtGuard } from "./guards/admin-jwt.guard";
import { AdminRolesGuard } from "./guards/admin-roles.guard";
import { AdminAuthService } from "./services/admin-auth.service";
import { AdminTenantsService } from "./services/admin-tenants.service";
import type { AdminJwtPayload } from "./strategies/admin-jwt.strategy";

// ── Auth ────────────────────────────────────────────────
@Controller("admin/auth")
export class AdminAuthController {
  constructor(private adminAuth: AdminAuthService) { }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: AdminLoginDto, @Req() req: Request) {
    return this.adminAuth.login(dto, req.ip);
  }

  // bootstrap endpoint — ใช้ครั้งแรกอย่างเดียว, ต้อง BOOTSTRAP_SECRET
  @Post("bootstrap")
  @HttpCode(HttpStatus.CREATED)
  bootstrap(@Body() dto: CreateFirstAdminDto) {
    const expected = process.env.ADMIN_BOOTSTRAP_SECRET;
    if (!expected || dto.secret !== expected) {
      return { error: "Forbidden" };
    }
    return this.adminAuth.createFirstAdmin(dto.email, dto.password, dto.name);
  }
}

// ── Tenants ─────────────────────────────────────────────
@Controller("admin/tenants")
@UseGuards(AdminJwtGuard, AdminRolesGuard)
export class AdminTenantsController {
  constructor(
    private tenants: AdminTenantsService,
    private adminAuth: AdminAuthService,
  ) { }

  @Get()
  list(@Query("page") page = "1", @Query("search") search = "") {
    return this.tenants.list(Number(page), search);
  }

  @Get("stats")
  @RequireAdminRole(AdminRole.SUPER_ADMIN, AdminRole.SUPPORT)
  getStats() {
    return this.tenants.getStats();
  }

  @Get(":id")
  getOne(@Param("id") id: string) {
    return this.tenants.getOne(id);
  }

  @Post()
  @RequireAdminRole(AdminRole.SUPER_ADMIN)
  create(@AdminUser() admin: AdminJwtPayload, @Body() dto: CreateTenantDto) {
    return this.tenants.create(dto, admin.sub);
  }

  @Patch(":id")
  @RequireAdminRole(AdminRole.SUPER_ADMIN, AdminRole.BILLING)
  update(
    @AdminUser() admin: AdminJwtPayload,
    @Param("id") id: string,
    @Body() dto: UpdateTenantDto,
  ) {
    return this.tenants.update(id, dto, admin.sub);
  }

  // ── Users ──────────────────────────────────────────────
  @Post(":id/users")
  @RequireAdminRole(AdminRole.SUPER_ADMIN)
  createUser(
    @AdminUser() admin: AdminJwtPayload,
    @Param("id") tenantId: string,
    @Body() dto: CreateTenantUserDto,
  ) {
    return this.tenants.createUser(tenantId, dto, admin.sub);
  }

  @Patch(":id/memberships/:membershipId/reset-pin")
  @RequireAdminRole(AdminRole.SUPER_ADMIN)
  resetPin(
    @AdminUser() admin: AdminJwtPayload,
    @Param("id") tenantId: string,
    @Param("membershipId") membershipId: string,
    @Body() dto: ResetPinDto,
  ) {
    return this.tenants.resetUserPin(tenantId, membershipId, dto.newPin, admin.sub);
  }

  // ── Impersonate ─────────────────────────────────────────
  @Post(":id/impersonate")
  @RequireAdminRole(AdminRole.SUPER_ADMIN, AdminRole.SUPPORT)
  @HttpCode(HttpStatus.OK)
  impersonate(
    @AdminUser() admin: AdminJwtPayload,
    @Param("id") tenantId: string,
    @Req() req: Request,
  ) {
    return this.adminAuth.impersonate(admin.sub, tenantId, req.ip);
  }
}

// ── Audit Logs ──────────────────────────────────────────
@Controller("admin/audit-logs")
@UseGuards(AdminJwtGuard, AdminRolesGuard)
@RequireAdminRole(AdminRole.SUPER_ADMIN)
export class AdminAuditController {
  constructor(private tenants: AdminTenantsService) { }

  @Get()
  getLogs(@Query("tenantId") tenantId?: string, @Query("page") page = "1") {
    return this.tenants.getAuditLogs(tenantId, Number(page));
  }
}
