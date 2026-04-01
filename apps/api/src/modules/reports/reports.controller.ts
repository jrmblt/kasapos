
import { Controller, Get, Query } from "@nestjs/common";
import { Permission } from "@repo/database";
import { format, startOfDay, subDays } from "date-fns";
import { RequirePermissions } from "../../auth/decorators/permissions.decorator";
import { PrismaService } from "../../prisma/prisma.service";

@Controller("reports")
export class ReportsController {
  constructor(private prisma: PrismaService) { }

  @Get("daily")
  @RequirePermissions(Permission.REPORT_VIEW)
  async daily(@Query("branchId") branchId: string, @Query("days") days = "14") {
    const n = Math.min(Number(days), 90);
    const result = [];

    for (let i = 0; i < n; i++) {
      const date = subDays(new Date(), i);
      const start = startOfDay(date);
      const end = new Date(start.getTime() + 86400000);

      const agg = await this.prisma.order.aggregate({
        where: {
          branchId,
          status: "COMPLETED",
          completedAt: { gte: start, lt: end },
        },
        _sum: { total: true },
        _count: { id: true },
      });

      result.push({
        period: format(date, "yyyy-MM-dd"),
        revenue: Number(agg._sum.total ?? 0),
        orders: agg._count.id,
        avgOrderValue:
          agg._count.id > 0 ? Number(agg._sum.total ?? 0) / agg._count.id : 0,
      });
    }

    return result;
  }

  @Get("top-items")
  @RequirePermissions(Permission.REPORT_VIEW)
  async topItems(
    @Query("branchId") branchId: string,
    @Query("days") days = "7",
  ) {
    const since = subDays(new Date(), Number(days));

    const items = await this.prisma.orderItem.groupBy({
      by: ["menuItemId", "name"],
      where: {
        order: { branchId, status: "COMPLETED", completedAt: { gte: since } },
        status: { not: "VOIDED" },
      },
      _sum: { qty: true, unitPrice: true },
      _count: { id: true },
      orderBy: { _sum: { qty: "desc" } },
      take: 20,
    });

    return items.map((i) => ({
      menuItemId: i.menuItemId,
      name: i.name,
      qty: i._sum.qty ?? 0,
      revenue: Number(i._sum.unitPrice ?? 0) * (i._sum.qty ?? 0),
    }));
  }
}
