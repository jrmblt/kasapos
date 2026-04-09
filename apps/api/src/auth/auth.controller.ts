import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import {
  CurrentUser,
  type JwtPayload,
} from "./decorators/current-user.decorator";
import { Public } from "./decorators/public.decorator";
import { LoginDto } from "./dtos/login.dto";
import { JwtRefreshGuard } from "./guards/jwt-refresh.guard";

@Controller("auth")
export class AuthController {
  constructor(private auth: AuthService) {}

  @Public()
  @Post("login")
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.pin);
  }

  // refresh — JwtRefreshGuard validates the refresh token signature,
  // payload: { sub, membershipId, tokenVersion }
  @Public()
  @UseGuards(JwtRefreshGuard)
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  refresh(@CurrentUser() user: any) {
    return this.auth.refresh(user.membershipId, user.tokenVersion);
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  logout(@CurrentUser() user: JwtPayload) {
    return this.auth.logout(user.membershipId);
  }

  @Post("logout-all")
  @HttpCode(HttpStatus.OK)
  logoutAll(@CurrentUser() user: JwtPayload) {
    return this.auth.logoutAll(user.membershipId);
  }

  // เรียกหลัง login ที่ requireTenantSelect: true
  @Public()
  @Post("select-tenant")
  @HttpCode(HttpStatus.OK)
  selectTenant(
    @Body() body: { userId: string; membershipId: string; pin: string },
  ) {
    return this.auth.selectTenant(body.userId, body.membershipId, body.pin);
  }
}
