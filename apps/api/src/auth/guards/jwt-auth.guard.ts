import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { Reflector }    from '@nestjs/core'
import { AuthGuard }    from '@nestjs/passport'
import { IS_PUBLIC_KEY } from '../decorators/public.decorator'

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super()
  }

  canActivate(ctx: ExecutionContext) {
    return super.canActivate(ctx)
  }

  handleRequest(err: unknown, user: unknown, _info: unknown, ctx: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ])
    if (isPublic) return user || null
    if (err || !user) throw err || new UnauthorizedException()
    return user
  }
}