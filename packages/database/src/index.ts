import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

export * from "@prisma/client";

// PrismaPg manages a pg.Pool internally.
// For infrastructure-level pooling (Supabase, Neon, etc.) just set DATABASE_URL
// to the PgBouncer URL — no code changes needed here.
const adapter = new PrismaPg(
  {
    connectionString: process.env.DATABASE_URL,
    max: Number(process.env.DATABASE_POOL_MAX ?? "10"),
    idleTimeoutMillis: Number(
      process.env.DATABASE_POOL_IDLE_TIMEOUT ?? "30000",
    ),
    connectionTimeoutMillis: Number(
      process.env.DATABASE_POOL_CONNECTION_TIMEOUT ?? "2000",
    ),
    allowExitOnIdle: true,
  },
  {
    onPoolError: (err) => console.error("[db] pool error:", err),
    onConnectionError: (err) => console.error("[db] connection error:", err),
  },
);

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
