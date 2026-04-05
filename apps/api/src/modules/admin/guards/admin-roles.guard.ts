import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AdminRole } from "@repo/database";

export const ADMIN_ROLES_KEY = "adminRoles";

@Injectable()
export class AdminRolesGuard implements CanActivate {
  constructor(private reflector: Reflector) { }

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.get<AdminRole[]>(
      ADMIN_ROLES_KEY,
      ctx.getHandler(),
    );
    if (!required?.length) return true;

    const { user } = ctx.switchToHttp().getRequest();
    if (!required.includes(user.adminRole)) {
      throw new ForbiddenException("ไม่มีสิทธิ์ดำเนินการนี้");
    }
    return true;
  }
}
