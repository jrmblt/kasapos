import { PrismaClient } from "@repo/database";

/**
 * PrismaService is a type alias for PrismaClient.
 * The actual instance (the `db` singleton from @repo/database) is provided
 * by PrismaModule via `useValue`, so no constructor is ever called here.
 */
export class PrismaService extends PrismaClient {}
