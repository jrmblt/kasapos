import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@repo/database";
import { PrismaService } from "../../prisma/prisma.service";
import { AdjustStockDto } from "./dto/adjust-stock.dto";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { CreateMenuItemDto } from "./dto/create-menu-item.dto";
import { UpdateMenuItemDto } from "./dto/update-menu-item.dto";

@Injectable()
export class MenuService {
  constructor(private prisma: PrismaService) {}

  // ── Categories ────────────────────────────────────────

  async getCategories(tenantId: string) {
    return this.prisma.category.findMany({
      where: { tenantId, isActive: true },
      include: {
        menuItems: {
          where: { isAvailable: true },
          orderBy: { sortOrder: "asc" },
          select: { id: true }, // แค่นับ จะดึงรายละเอียดจาก getMenuItems
        },
      },
      orderBy: { sortOrder: "asc" },
    });
  }

  async createCategory(tenantId: string, dto: CreateCategoryDto) {
    return this.prisma.category.create({
      data: { ...dto, tenantId },
    });
  }

  async updateCategory(
    tenantId: string,
    categoryId: string,
    dto: Partial<CreateCategoryDto> & { isActive?: boolean },
  ) {
    await this.assertCategoryOwnership(tenantId, categoryId);
    return this.prisma.category.update({
      where: { id: categoryId },
      data: dto,
    });
  }

  // ── Menu Items ────────────────────────────────────────

  async getMenuItems(tenantId: string, includeHidden = false) {
    return this.prisma.menuItem.findMany({
      where: {
        tenantId,
        ...(!includeHidden && { isAvailable: true }),
      },
      include: {
        category: { select: { id: true, name: true, sortOrder: true } },
        modifiers: { orderBy: { sortOrder: "asc" } },
      },
      orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }],
    });
  }

  async getMenuItem(tenantId: string, id: string) {
    const item = await this.prisma.menuItem.findUnique({
      where: { id },
      include: { modifiers: { orderBy: { sortOrder: "asc" } } },
    });
    if (!item || item.tenantId !== tenantId) {
      throw new NotFoundException("ไม่พบเมนูนี้");
    }
    return item;
  }

  async createMenuItem(tenantId: string, dto: CreateMenuItemDto) {
    const { modifiers, ...itemData } = dto;

    return this.prisma.$transaction(async (tx) => {
      const item = await tx.menuItem.create({
        data: { ...itemData, tenantId },
      });

      if (modifiers?.length) {
        await tx.modifier.createMany({
          data: modifiers.map(({ options, ...m }) => ({
            ...m,
            menuItemId: item.id,
            tenantId,
            options: options as unknown as Prisma.InputJsonValue,
          })),
        });
      }

      return tx.menuItem.findUnique({
        where: { id: item.id },
        include: { modifiers: true },
      });
    });
  }

  async updateMenuItem(tenantId: string, id: string, dto: UpdateMenuItemDto) {
    await this.assertMenuItemOwnership(tenantId, id);
    const { modifiers, ...itemData } = dto;

    return this.prisma.$transaction(async (tx) => {
      await tx.menuItem.update({
        where: { id },
        data: itemData,
      });

      // ถ้าส่ง modifiers มา → replace ทั้งหมด
      if (modifiers !== undefined) {
        await tx.modifier.deleteMany({ where: { menuItemId: id } });
        if (modifiers.length) {
          await tx.modifier.createMany({
            data: modifiers.map(({ options, ...m }) => ({
              ...m,
              menuItemId: id,
              tenantId,
              options: options as unknown as Prisma.InputJsonValue,
            })),
          });
        }
      }

      return tx.menuItem.findUnique({
        where: { id },
        include: { modifiers: true },
      });
    });
  }

  async deleteMenuItem(tenantId: string, id: string) {
    await this.assertMenuItemOwnership(tenantId, id);
    // soft delete
    return this.prisma.menuItem.update({
      where: { id },
      data: { isAvailable: false },
    });
  }

  // ── Stock ─────────────────────────────────────────────

  async adjustStock(tenantId: string, menuItemId: string, dto: AdjustStockDto) {
    const item = await this.prisma.menuItem.findUnique({
      where: { id: menuItemId },
      select: { tenantId: true, stockQty: true, name: true },
    });

    if (!item || item.tenantId !== tenantId) {
      throw new NotFoundException("ไม่พบเมนูนี้");
    }
    if (item.stockQty === null) {
      throw new BadRequestException(`${item.name} ไม่ได้ track stock`);
    }

    const newQty = item.stockQty + dto.delta;
    if (newQty < 0) {
      throw new BadRequestException(`stock ไม่พอ (เหลือ ${item.stockQty})`);
    }

    return this.prisma.$transaction([
      this.prisma.menuItem.update({
        where: { id: menuItemId },
        data: {
          stockQty: newQty,
          isAvailable: newQty > 0,
        },
      }),
      this.prisma.stockLog.create({
        data: {
          menuItemId,
          delta: dto.delta,
          qtyAfter: newQty,
          reason: dto.delta > 0 ? "MANUAL_ADD" : "MANUAL_DEDUCT",
          note: dto.note,
        },
      }),
    ]);
  }

  async getStockLogs(tenantId: string, menuItemId: string) {
    await this.assertMenuItemOwnership(tenantId, menuItemId);
    return this.prisma.stockLog.findMany({
      where: { menuItemId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  // ── Private helpers ───────────────────────────────────

  private async assertMenuItemOwnership(tenantId: string, id: string) {
    const item = await this.prisma.menuItem.findUnique({
      where: { id },
      select: { tenantId: true },
    });
    if (!item || item.tenantId !== tenantId) {
      throw new NotFoundException("ไม่พบเมนูนี้");
    }
  }

  private async assertCategoryOwnership(tenantId: string, id: string) {
    const cat = await this.prisma.category.findUnique({
      where: { id },
      select: { tenantId: true },
    });
    if (!cat || cat.tenantId !== tenantId) {
      throw new NotFoundException("ไม่พบหมวดหมู่นี้");
    }
  }
}
