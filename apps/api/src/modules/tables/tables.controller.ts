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
import { CreateTableDto } from "./dto/create-table.dto";
import { TablesService } from "./tables.service";

@Controller("tables")
export class TablesController {
  constructor(private tables: TablesService) { }

  // ── Public: self-order สแกน QR ────────────────────────
  @Public()
  @Get("by-token/:token")
  findByToken(@Param("token") token: string) {
    return this.tables.findByToken(token);
  }

  // ── Staff: ดูโต๊ะทั้งหมดของสาขา ──────────────────────
  @Get("branch/:branchId")
  @RequirePermissions(Permission.TABLE_MANAGE)
  findAll(@Param("branchId") branchId: string) {
    return this.tables.findAll(branchId);
  }

  // ── Manager: สร้างโต๊ะ ────────────────────────────────
  @Post("branch/:branchId")
  @RequirePermissions(Permission.TABLE_MANAGE)
  create(@Param("branchId") branchId: string, @Body() dto: CreateTableDto) {
    return this.tables.create(branchId, dto);
  }

  // ── Manager: สร้าง QR ใหม่ ────────────────────────────
  @Patch(":id/regenerate-qr")
  @RequirePermissions(Permission.TABLE_MANAGE)
  @HttpCode(HttpStatus.OK)
  regenerateQr(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.tables.regenerateQr(id, user.tenantId);
  }
}
