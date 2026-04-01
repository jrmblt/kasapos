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
import { RequirePermissions } from "../../auth/decorators/permissions.decorator";
import { CloseShiftDto, OpenShiftDto } from "./dto/open-shift.dto";
import { ShiftsService } from "./shifts.service";

@Controller("shifts")
export class ShiftsController {
  constructor(private shifts: ShiftsService) { }

  @Post("open")
  @RequirePermissions(Permission.SHIFT_OPEN)
  open(@Body() dto: OpenShiftDto) {
    return this.shifts.open(dto.branchId, dto.userId, dto.openCash);
  }

  @Patch(":id/close")
  @RequirePermissions(Permission.SHIFT_CLOSE)
  close(@Param("id") id: string, @Body() dto: CloseShiftDto) {
    return this.shifts.close(id, dto.closeCash);
  }

  @Get("current")
  @RequirePermissions(Permission.SHIFT_OPEN)
  getCurrent(
    @Query("branchId") branchId: string,
    @Query("userId") userId: string,
  ) {
    return this.shifts.getCurrent(branchId, userId);
  }
}
