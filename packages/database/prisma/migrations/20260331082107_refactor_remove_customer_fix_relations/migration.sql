/*
  Warnings:

  - You are about to drop the column `customerId` on the `loyalty_accounts` table. All the data in the column will be lost.
  - You are about to drop the `customers` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "CouponType" AS ENUM ('PERCENT_DISCOUNT', 'FIXED_DISCOUNT', 'FREE_ITEM');

-- CreateEnum
CREATE TYPE "CouponTargetType" AS ENUM ('PUBLIC', 'MEMBER_TIER', 'MEMBER_NEW', 'MEMBER_FIRST_ORDER', 'PHYSICAL_QR');

-- DropForeignKey
ALTER TABLE "customers" DROP CONSTRAINT "customers_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "loyalty_accounts" DROP CONSTRAINT "loyalty_accounts_customerId_fkey";

-- DropForeignKey
ALTER TABLE "loyalty_accounts" DROP CONSTRAINT "loyalty_accounts_tierId_fkey";

-- DropIndex
DROP INDEX "loyalty_accounts_customerId_key";

-- AlterTable
ALTER TABLE "branches" ADD COLUMN     "loyaltyEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "payAtCounterEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "payLaterEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "payOnlineEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "queueDisplayName" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "selfOrderEnabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "loyalty_accounts" DROP COLUMN "customerId",
ADD COLUMN     "name" TEXT,
ADD COLUMN     "note" TEXT,
ALTER COLUMN "tierId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "checkoutMode" TEXT,
ADD COLUMN     "guestName" TEXT,
ADD COLUMN     "memberAccountId" TEXT;

-- DropTable
DROP TABLE "customers";

-- CreateTable
CREATE TABLE "coupons" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CouponType" NOT NULL,
    "targetType" "CouponTargetType" NOT NULL,
    "value" DECIMAL(10,2) NOT NULL,
    "minOrderAmt" DECIMAL(10,2),
    "maxDiscountAmt" DECIMAL(10,2),
    "tierId" TEXT,
    "usageLimit" INTEGER,
    "usagePerMember" INTEGER DEFAULT 1,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupon_usages" (
    "id" TEXT NOT NULL,
    "couponId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "accountId" TEXT,
    "discount" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coupon_usages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_codes" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attempts" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "otp_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_sessions" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "coupons_tenantId_idx" ON "coupons"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "coupons_tenantId_code_key" ON "coupons"("tenantId", "code");

-- CreateIndex
CREATE INDEX "coupon_usages_couponId_idx" ON "coupon_usages"("couponId");

-- CreateIndex
CREATE INDEX "coupon_usages_accountId_idx" ON "coupon_usages"("accountId");

-- CreateIndex
CREATE INDEX "otp_codes_phone_tenantId_createdAt_idx" ON "otp_codes"("phone", "tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "member_sessions_token_key" ON "member_sessions"("token");

-- CreateIndex
CREATE INDEX "member_sessions_accountId_idx" ON "member_sessions"("accountId");

-- AddForeignKey
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_tierId_fkey" FOREIGN KEY ("tierId") REFERENCES "loyalty_tier_configs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_usages" ADD CONSTRAINT "coupon_usages_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_usages" ADD CONSTRAINT "coupon_usages_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "coupons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_usages" ADD CONSTRAINT "coupon_usages_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "loyalty_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_memberAccountId_fkey" FOREIGN KEY ("memberAccountId") REFERENCES "loyalty_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_accounts" ADD CONSTRAINT "loyalty_accounts_tierId_fkey" FOREIGN KEY ("tierId") REFERENCES "loyalty_tier_configs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_sessions" ADD CONSTRAINT "member_sessions_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "loyalty_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
