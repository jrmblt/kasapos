import { SetMetadata } from "@nestjs/common";
import { AdminRole } from "@repo/database";
import { ADMIN_ROLES_KEY } from "../guards/admin-roles.guard";

export const RequireAdminRole = (...roles: AdminRole[]) =>
  SetMetadata(ADMIN_ROLES_KEY, roles);
