import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export interface JwtPayload {
  sub: string;           // userId
  membershipId: string;
  tenantId: string;
  branchId: string | null;
  role: string;          // baseRole (OWNER | MANAGER | CASHIER | KITCHEN)
  name: string;
  tokenVersion: number;  // membership.tokenVersion — ใช้ invalidate token
  permissions: string[];
}

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): JwtPayload | null => {
    return ctx.switchToHttp().getRequest().user ?? null;
  },
);
