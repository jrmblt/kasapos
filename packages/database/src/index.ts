import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import "dotenv/config";

export * from "@prisma/client";

// PrismaPg manages a pg.Pool internally.
// For infrastructure-level pooling (Supabase, Neon, etc.) just set DATABASE_URL
// to the PgBouncer URL — no code changes needed here.
export function createAdapter() {
  return new PrismaPg(
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
}

export function createDb() {
  return new PrismaClient({
    adapter: createAdapter(),
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

export type {
  Branch,
  Category,
  Customer,
  LoyaltyAccount,
  LoyaltyTierConfig,
  MenuItem,
  Modifier,
  Order,
  OrderItem,
  Payment,
  PointTransaction,
  QueueTicket,
  Shift,
  StockLog,
  Table,
  TableSession,
  Tenant,
  User,
} from "@prisma/client";

export {
  ModifierType,
  OrderItemStatus,
  OrderStatus,
  OrderType,
  PaymentMethod,
  PaymentStatus,
  PointType,
  QueueStatus,
  StockLogReason,
  TableSessionStatus,
  TableStatus,
  UserRole,
} from "@prisma/client";
