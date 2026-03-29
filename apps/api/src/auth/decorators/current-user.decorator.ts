import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export interface JwtPayload {
  sub: string;
  tenantId: string;
  branchId: string | null;
  role: string;
  name: string;
  version: number; // tokenVersion — เพิ่มมาจากเดิม
  jti: string; // unique token id
  permissions: string[];
}

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): JwtPayload => {
    return ctx.switchToHttp().getRequest().user;
  },
);
