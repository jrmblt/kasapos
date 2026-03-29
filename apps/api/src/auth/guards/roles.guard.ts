import {
  Injectable, CanActivate,
  ExecutionContext, ForbiddenException,
} from '@nestjs/common'
import { Reflector }  from '@nestjs/core'
import { UserRole }   from '@repo/database'
import { ROLES_KEY }  from '../decorators/roles.decorator'
import { JwtPayload } from '../decorators/current-user.decorator'

const HIERARCHY: Record<UserRole, number> = {
  OWNER:   4,
  MANAGER: 3,
  CASHIER: 2,
  KITCHEN: 1,
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ])
    if (!required?.length) return true

    const user    = ctx.switchToHttp().getRequest().user as JwtPayload
    const level   = HIERARCHY[user.role as UserRole] ?? 0
    const minimum = Math.min(...required.map(r => HIERARCHY[r]))

    if (level < minimum) {
      throw new ForbiddenException(`ต้องการสิทธิ์ ${required.join(' หรือ ')}`)
    }
    return true
  }
}