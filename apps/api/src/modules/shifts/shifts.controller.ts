import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { Permission } from "@repo/database";
import {
  CurrentUser,
  type JwtPayload,
} from "../../auth/decorators/current-user.decorator";
import { RequirePermissions } from "../../auth/decorators/permissions.decorator";
import { CloseShiftDto, OpenShiftDto } from "./dto/open-shift.dto";
import { ShiftsService } from "./shifts.service";

@Controller("shifts")
export class ShiftsController {
  constructor(private shifts: ShiftsService) {}

  @Post("open")
  @RequirePermissions(Permission.SHIFT_OPEN)
  open(@CurrentUser() user: JwtPayload, @Body() dto: OpenShiftDto) {
    return this.shifts.open(dto.branchId, user.membershipId, dto.openCash);
  }

  @Patch(":id/close")
  @RequirePermissions(Permission.SHIFT_CLOSE)
  close(@Param("id") id: string, @Body() dto: CloseShiftDto) {
    return this.shifts.close(id, dto.closeCash);
  }

  @Get("current")
  @RequirePermissions(Permission.SHIFT_OPEN)
  getCurrent(
    @CurrentUser() user: JwtPayload,
    @Query("branchId") branchId: string,
  ) {
    return this.shifts.getCurrent(branchId, user.membershipId);
  }
}
