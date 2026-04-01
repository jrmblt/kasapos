import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthGuard } from "@nestjs/passport";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(ctx: ExecutionContext) {
    return super.canActivate(ctx);
  }

  handleRequest<TUser = any>(
    err: any,
    user: TUser,
    _info: any,
    ctx: ExecutionContext,
  ): TUser {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return user ?? (null as unknown as TUser);
    if (err || !user) throw err || new UnauthorizedException();
    return user;
  }
}
