import { Body, Controller, Get, NotFoundException, Param, Patch } from "@nestjs/common";
import { Permission } from "@repo/database";
import type { JwtPayload } from "src/auth/decorators/current-user.decorator";
import { CurrentUser } from "src/auth/decorators/current-user.decorator";
import { RequirePermissions } from "src/auth/decorators/permissions.decorator";
import { PrismaService } from "src/prisma/prisma.service";
import { BranchService } from "./branch.service";

@Controller("branches")
export class BranchController {
  constructor(
    private readonly branchService: BranchService,
    private readonly prisma: PrismaService,
  ) { }

  @Get(":id/settings")
  @RequirePermissions(Permission.SETTINGS_READ)
  async getSettings(@Param("id") id: string, @CurrentUser() user: JwtPayload) {
    return this.prisma.branch.findFirst({
      where: { id, tenantId: user.tenantId },
      select: {
        id: true,
        name: true,
        selfOrderEnabled: true,
        payLaterEnabled: true,
        payAtCounterEnabled: true,
        payOnlineEnabled: true,
        queueEnabled: true,
        queueDisplayName: true,
        loyaltyEnabled: true,
        taxRate: true,
      },
    });
  }

  @Patch(":id/settings")
  @RequirePermissions(Permission.SETTINGS_WRITE)
  async updateSettings(
    @Param("id") id: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: Partial<{
      selfOrderEnabled: boolean;
      payLaterEnabled: boolean;
      payAtCounterEnabled: boolean;
      payOnlineEnabled: boolean;
      queueEnabled: boolean;
      queueDisplayName: boolean;
      loyaltyEnabled: boolean;
    }>,
  ) {
    const branch = await this.prisma.branch.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!branch) throw new NotFoundException("ไม่พบสาขา");
    return this.prisma.branch.update({ where: { id }, data: body });
  }
}
