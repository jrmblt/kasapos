import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { Permission } from "@repo/database";
import { Public } from "src/auth/decorators/public.decorator";
import type { JwtPayload } from "../../auth/decorators/current-user.decorator";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { RequirePermissions } from "../../auth/decorators/permissions.decorator";
import { AdjustStockDto } from "./dto/adjust-stock.dto";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { CreateMenuItemDto } from "./dto/create-menu-item.dto";
import { UpdateMenuItemDto } from "./dto/update-menu-item.dto";
import { MenuService } from "./menu.service";

@Controller("menu")
export class MenuController {
  constructor(private menu: MenuService) { }

  // ── Categories ────────────────────────────────────────

  @Public()
  @Get("categories")
  getCategories(
    @CurrentUser() user: JwtPayload | null,
    @Query("tenantId") queryTenantId?: string,
  ) {
    const tenantId = user?.tenantId ?? queryTenantId;
    if (!tenantId) throw new BadRequestException("ต้องระบุ tenantId");
    return this.menu.getCategories(tenantId);
  }

  @Post("categories")
  @RequirePermissions(Permission.MENU_WRITE)
  createCategory(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateCategoryDto,
  ) {
    return this.menu.createCategory(user.tenantId, dto);
  }

  @Patch("categories/:id")
  @RequirePermissions(Permission.MENU_WRITE)
  updateCategory(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body() dto: CreateCategoryDto,
  ) {
    return this.menu.updateCategory(user.tenantId, id, dto);
  }

  // ── Menu Items ────────────────────────────────────────

  @Public()
  @Get()
  getMenuItems(
    @CurrentUser() user: JwtPayload | null,
    @Query("tenantId") queryTenantId?: string,
    @Query("includeHidden") includeHidden?: string,
  ) {
    // staff ใช้จาก token, self-order ใช้จาก query
    const tenantId = user?.tenantId ?? queryTenantId;
    if (!tenantId) throw new BadRequestException("ต้องระบุ tenantId");
    return this.menu.getMenuItems(tenantId, includeHidden === "true");
  }

  @Get(":id")
  @RequirePermissions(Permission.MENU_READ)
  getMenuItem(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.menu.getMenuItem(user.tenantId, id);
  }

  @Post()
  @RequirePermissions(Permission.MENU_WRITE)
  createMenuItem(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateMenuItemDto,
  ) {
    return this.menu.createMenuItem(user.tenantId, dto);
  }

  @Patch(":id")
  @RequirePermissions(Permission.MENU_WRITE)
  updateMenuItem(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body() dto: UpdateMenuItemDto,
  ) {
    return this.menu.updateMenuItem(user.tenantId, id, dto);
  }

  @Delete(":id")
  @RequirePermissions(Permission.MENU_WRITE)
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteMenuItem(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.menu.deleteMenuItem(user.tenantId, id);
  }

  // ── Stock ─────────────────────────────────────────────

  @Post(":id/stock/adjust")
  @RequirePermissions(Permission.STOCK_ADJUST)
  adjustStock(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body() dto: AdjustStockDto,
  ) {
    return this.menu.adjustStock(user.tenantId, id, dto);
  }

  @Get(":id/stock/logs")
  @RequirePermissions(Permission.STOCK_ADJUST)
  getStockLogs(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.menu.getStockLogs(user.tenantId, id);
  }
}
