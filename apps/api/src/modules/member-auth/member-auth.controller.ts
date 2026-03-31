import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
} from "@nestjs/common";
import { Public } from "../../auth/decorators/public.decorator";
import { RequestOtpDto } from "./dto/request-otp.dto";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { VerifyOtpDto } from "./dto/verify-otp.dto";
import { MemberAuthService } from "./member-auth.service";

// Member endpoints ทั้งหมด Public
// auth ทำผ่าน X-Member-Token header แทน JWT
@Public()
@Controller("member")
export class MemberAuthController {
  constructor(private memberAuth: MemberAuthService) { }

  @Post("otp/request")
  @HttpCode(HttpStatus.OK)
  requestOtp(@Body() dto: RequestOtpDto) {
    return this.memberAuth.requestOtp(dto);
  }

  @Post("otp/verify")
  @HttpCode(HttpStatus.OK)
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.memberAuth.verifyOtp(dto);
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  logout(@Headers("x-member-token") token: string) {
    return this.memberAuth.logout(token);
  }

  @Patch("profile")
  updateProfile(
    @Headers("x-member-token") token: string,
    @Body() dto: UpdateProfileDto,
  ) {
    // validate session ก่อน update
    return this.memberAuth
      .validateSession(token)
      .then((account) => this.memberAuth.updateProfile(account.id, dto.name));
  }

  // self-order ใช้ validate session ก่อน checkout
  @Post("session/validate")
  @HttpCode(HttpStatus.OK)
  validateSession(@Headers("x-member-token") token: string) {
    return this.memberAuth.validateSession(token);
  }
}
