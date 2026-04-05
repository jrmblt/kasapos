import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import {
  AdminAuditController,
  AdminAuthController,
  AdminTenantsController,
} from "./admin.controller";
import { AdminRolesGuard } from "./guards/admin-roles.guard";
import { AdminAuthService } from "./services/admin-auth.service";
import { AdminTenantsService } from "./services/admin-tenants.service";
import { AdminJwtStrategy } from "./strategies/admin-jwt.strategy";

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.ADMIN_JWT_SECRET ?? "admin-secret-change-me",
      signOptions: { expiresIn: "8h" },
    }),
  ],
  controllers: [
    AdminAuthController,
    AdminTenantsController,
    AdminAuditController,
  ],
  providers: [
    AdminAuthService,
    AdminTenantsService,
    AdminJwtStrategy,
    AdminRolesGuard,
  ],
  exports: [AdminAuthService],
})
export class AdminModule { }
