import { Module } from "@nestjs/common";
import { MemberAuthController } from "./member-auth.controller";
import { MemberAuthService } from "./member-auth.service";

@Module({
  controllers: [MemberAuthController],
  providers: [MemberAuthService],
  exports: [MemberAuthService],
})
export class MemberAuthModule { }
