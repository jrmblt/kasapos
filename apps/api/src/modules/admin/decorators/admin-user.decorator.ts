import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import type { AdminJwtPayload } from '../strategies/admin-jwt.strategy'

export const AdminUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AdminJwtPayload =>
    ctx.switchToHttp().getRequest().user
)