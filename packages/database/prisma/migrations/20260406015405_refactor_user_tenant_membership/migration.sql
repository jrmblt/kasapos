/*
  Data-preserving refactor: tenant-scoped fields move from users → tenant_memberships.

  Membership primary key is set to the existing user id so orders.cashierId (still storing
  that id) and shifts backfill (membershipId = former userId) remain valid without rewriting
  order rows.

  Requires: no duplicate non-null emails on users (global unique on email).
*/
-- DropForeignKey
ALTER TABLE "orders" DROP CONSTRAINT "orders_cashierId_fkey";

ALTER TABLE "shifts" DROP CONSTRAINT "shifts_userId_fkey";

ALTER TABLE "users" DROP CONSTRAINT "users_branchId_fkey";

ALTER TABLE "users" DROP CONSTRAINT "users_roleId_fkey";

ALTER TABLE "users" DROP CONSTRAINT "users_tenantId_fkey";

-- DropIndex
DROP INDEX "shifts_userId_idx";

DROP INDEX "users_branchId_idx";

DROP INDEX "users_tenantId_email_key";

DROP INDEX "users_tenantId_idx";

-- CreateTable
CREATE TABLE "tenant_memberships" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT,
    "roleId" TEXT,
    "pinCode" TEXT,
    "tokenVersion" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_memberships_pkey" PRIMARY KEY ("id")
);

-- One membership per existing user (id reused = stable cashierId / shift mapping)
INSERT INTO "tenant_memberships" ("id", "userId", "tenantId", "branchId", "roleId", "pinCode", "tokenVersion", "isActive", "lastUsedAt", "createdAt", "updatedAt")
SELECT
    "u"."id",
    "u"."id",
    "u"."tenantId",
    "u"."branchId",
    "u"."roleId",
    "u"."pinCode",
    "u"."tokenVersion",
    "u"."isActive",
    NULL,
    "u"."createdAt",
    "u"."updatedAt"
FROM "users" AS "u";

-- Shifts: nullable column → backfill → NOT NULL → drop legacy userId
ALTER TABLE "shifts" ADD COLUMN "membershipId" TEXT;

UPDATE "shifts" SET "membershipId" = "userId";

ALTER TABLE "shifts" ALTER COLUMN "membershipId" SET NOT NULL;

ALTER TABLE "shifts" DROP COLUMN "userId";

-- Users: drop tenant-scoped columns; isActive stays on users (see schema.prisma)
ALTER TABLE "users" DROP COLUMN "branchId",
DROP COLUMN "pinCode",
DROP COLUMN "roleId",
DROP COLUMN "tenantId",
DROP COLUMN "tokenVersion";

-- CreateIndex
CREATE INDEX "tenant_memberships_userId_idx" ON "tenant_memberships"("userId");

CREATE INDEX "tenant_memberships_tenantId_idx" ON "tenant_memberships"("tenantId");

CREATE UNIQUE INDEX "tenant_memberships_userId_tenantId_key" ON "tenant_memberships"("userId", "tenantId");

CREATE INDEX "shifts_membershipId_idx" ON "shifts"("membershipId");

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- AddForeignKey
ALTER TABLE "tenant_memberships" ADD CONSTRAINT "tenant_memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tenant_memberships" ADD CONSTRAINT "tenant_memberships_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tenant_memberships" ADD CONSTRAINT "tenant_memberships_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "tenant_memberships" ADD CONSTRAINT "tenant_memberships_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "orders" ADD CONSTRAINT "orders_cashierId_fkey" FOREIGN KEY ("cashierId") REFERENCES "tenant_memberships"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "shifts" ADD CONSTRAINT "shifts_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "tenant_memberships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
